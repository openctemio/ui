/**
 * WebSocket Client
 *
 * A robust WebSocket client with:
 * - Automatic reconnection with exponential backoff
 * - Channel subscription management
 * - Connection state tracking
 * - Token-based authentication
 */

import type {
  ConnectionState,
  WebSocketMessage,
  SubscribeRequest,
  UnsubscribeRequest,
  EventMessage,
  ErrorMessage,
} from './types'

import { devLog } from '@/lib/logger'

// ============================================
// CONFIGURATION
// ============================================

/** Default reconnection settings */
const DEFAULT_CONFIG = {
  /** Initial reconnect delay in ms */
  initialReconnectDelay: 1000,
  /** Maximum reconnect delay in ms */
  maxReconnectDelay: 30000,
  /** Maximum number of reconnect attempts (0 = infinite) */
  maxReconnectAttempts: 10,
  /** Ping interval in ms (keep-alive) */
  pingInterval: 30000,
  /** Pong timeout in ms (consider disconnected if no pong received) */
  pongTimeout: 10000,
}

export interface WebSocketClientConfig {
  /** WebSocket URL (e.g., ws://localhost:8080/api/v1/ws) */
  url: string
  /** Authentication token (sent via query param or header) */
  token?: string
  /**
   * Async ticket provider for single-use WS auth (F-8 ticket flow).
   * When set, takes precedence over `token`: the client calls it
   * before every connect/reconnect to mint a fresh 64-hex ticket and
   * passes it as `?ticket=<value>`. One ticket is consumed per
   * connection because the server DELs it on redemption.
   */
  fetchTicket?: () => Promise<string>
  /** Reconnection settings */
  initialReconnectDelay?: number
  maxReconnectDelay?: number
  maxReconnectAttempts?: number
  pingInterval?: number
  pongTimeout?: number
  /** Callback when connection state changes */
  onStateChange?: (state: ConnectionState) => void
  /** Callback when an error occurs */
  onError?: (error: Error) => void
  /** Callback when connection is established */
  onConnect?: () => void
  /** Callback when connection is closed */
  onDisconnect?: (reason?: string) => void
}

// ============================================
// CLIENT CLASS
// ============================================

/** Internal config type with optional token / ticket provider */
type InternalConfig = Omit<Required<WebSocketClientConfig>, 'token' | 'fetchTicket'> & {
  token?: string
  fetchTicket?: () => Promise<string>
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private config: InternalConfig
  private state: ConnectionState = 'disconnected'
  private reconnectAttempts = 0
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private pingTimeout: ReturnType<typeof setTimeout> | null = null
  private pongTimeout: ReturnType<typeof setTimeout> | null = null

  /** Active subscriptions: channel -> Set of callbacks */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private subscriptions = new Map<string, Set<(data: any) => void>>()
  /** Pending subscription requests: requestId -> resolve/reject */
  private pendingRequests = new Map<string, { resolve: () => void; reject: (err: Error) => void }>()
  /** Request ID counter */
  private requestIdCounter = 0

  constructor(config: WebSocketClientConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      onStateChange: config.onStateChange ?? (() => {}),
      onError: config.onError ?? ((err) => devLog.error('[WebSocket] Error:', err)),
      onConnect: config.onConnect ?? (() => {}),
      onDisconnect: config.onDisconnect ?? (() => {}),
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      devLog.log('[WebSocket] Already connected or connecting')
      return
    }

    this.setState('connecting')
    this.createConnection()
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.clearTimers()
    this.reconnectAttempts = 0

    // Reject all pending requests
    for (const [, handlers] of this.pendingRequests.entries()) {
      handlers.reject(new Error('WebSocket client disconnected'))
    }
    this.pendingRequests.clear()

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    this.setState('disconnected')
    this.config.onDisconnect?.('Client disconnect')
  }

  /**
   * Subscribe to a channel
   * @param channel Channel name (e.g., "finding:abc-123")
   * @param callback Function to call when events are received
   * @returns Promise that resolves when subscription is confirmed
   */
  async subscribe<T = unknown>(channel: string, callback: (data: T) => void): Promise<void> {
    // Add callback to subscriptions
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set())
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.subscriptions.get(channel)!.add(callback as (data: any) => void)

    // If not connected, subscription will be sent on reconnect
    if (this.state !== 'connected') {
      devLog.log('[WebSocket] Queued subscription for', channel)
      return
    }

    // Send subscribe request
    const requestId = this.generateRequestId()
    const request: SubscribeRequest = {
      type: 'subscribe',
      channel,
      request_id: requestId,
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject })
      this.send(request)

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId)
          reject(new Error('Subscribe request timed out'))
        }
      }, 10000)
    })
  }

  /**
   * Unsubscribe from a channel
   * @param channel Channel name
   * @param callback Optional: specific callback to remove. If not provided, removes all callbacks.
   */
  async unsubscribe(
    channel: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback?: (data: any) => void
  ): Promise<void> {
    const callbacks = this.subscriptions.get(channel)
    if (!callbacks) return

    if (callback) {
      callbacks.delete(callback)
      // If there are still other callbacks, don't unsubscribe from server
      if (callbacks.size > 0) return
    }

    // Remove all callbacks for this channel
    this.subscriptions.delete(channel)

    // Send unsubscribe request if connected
    if (this.state !== 'connected') return

    const requestId = this.generateRequestId()
    const request: UnsubscribeRequest = {
      type: 'unsubscribe',
      channel,
      request_id: requestId,
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject })
      this.send(request)

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId)
          reject(new Error('Unsubscribe request timed out'))
        }
      }, 10000)
    })
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Update authentication token
   */
  updateToken(token: string): void {
    this.config.token = token
    // Reconnect with new token if already connected
    if (this.state === 'connected') {
      this.disconnect()
      this.connect()
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private createConnection(): void {
    // Resolve auth (ticket > token) asynchronously so we can mint a
    // fresh single-use ticket per connection. The WS open itself stays
    // synchronous inside the promise callback so setupEventHandlers can
    // attach before any event fires.
    const buildAndOpen = (auth: { ticket?: string; token?: string }) => {
      const url = new URL(this.config.url)
      if (auth.ticket) {
        url.searchParams.set('ticket', auth.ticket)
      } else if (auth.token) {
        url.searchParams.set('token', auth.token)
      }

      devLog.log(
        '[WebSocket] Connecting to:',
        url
          .toString()
          .replace(/ticket=[^&]+/, 'ticket=***')
          .replace(/token=[^&]+/, 'token=***')
      )

      try {
        this.ws = new WebSocket(url.toString())
        this.setupEventHandlers()
      } catch (error) {
        devLog.error('[WebSocket] Failed to create connection:', error)
        this.handleError(error instanceof Error ? error : new Error(String(error)))
      }
    }

    if (this.config.fetchTicket) {
      this.config
        .fetchTicket()
        .then((ticket) => buildAndOpen({ ticket }))
        .catch((error) => {
          devLog.error('[WebSocket] Failed to fetch ticket:', error)
          this.handleError(error instanceof Error ? error : new Error(String(error)))
        })
      return
    }

    buildAndOpen({ token: this.config.token })
  }

  private setupEventHandlers(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      devLog.log('[WebSocket] Connected')
      this.reconnectAttempts = 0
      this.setState('connected')
      this.config.onConnect?.()
      this.startPingInterval()
      this.resubscribeAll()
    }

    this.ws.onclose = (event) => {
      devLog.log('[WebSocket] Disconnected:', event.code, event.reason)
      this.clearTimers()

      // Don't reconnect if closed cleanly by client
      if (event.code === 1000) {
        this.setState('disconnected')
        this.config.onDisconnect?.(event.reason)
        return
      }

      // Schedule reconnect
      this.scheduleReconnect()
    }

    this.ws.onerror = (event) => {
      devLog.error('[WebSocket] Error:', event)
      this.handleError(new Error('WebSocket error'))
    }

    this.ws.onmessage = (event) => {
      devLog.log('[DEBUG WS] Received payload:', event.data)
      this.handleMessage(event.data)
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as WebSocketMessage

      switch (message.type) {
        case 'pong':
          this.handlePong()
          break

        case 'subscribed':
          this.handleSubscribed(message)
          break

        case 'unsubscribed':
          this.handleUnsubscribed(message)
          break

        case 'event':
          this.handleEvent(message as EventMessage)
          break

        case 'error':
          this.handleServerError(message as ErrorMessage)
          break

        default:
          devLog.log('[WebSocket] Unknown message type:', message.type)
      }
    } catch (error) {
      devLog.error('[WebSocket] Failed to parse message:', error)
    }
  }

  private handlePong(): void {
    // Clear pong timeout
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout)
      this.pongTimeout = null
    }
  }

  private handleSubscribed(message: WebSocketMessage): void {
    devLog.log('[WebSocket] Subscribed to:', message.channel)
    const requestId = message.request_id
    if (requestId && this.pendingRequests.has(requestId)) {
      this.pendingRequests.get(requestId)!.resolve()
      this.pendingRequests.delete(requestId)
    }
  }

  private handleUnsubscribed(message: WebSocketMessage): void {
    devLog.log('[WebSocket] Unsubscribed from:', message.channel)
    const requestId = message.request_id
    if (requestId && this.pendingRequests.has(requestId)) {
      this.pendingRequests.get(requestId)!.resolve()
      this.pendingRequests.delete(requestId)
    }
  }

  private handleEvent(message: EventMessage): void {
    const channel = message.channel
    const callbacks = this.subscriptions.get(channel)

    if (callbacks && callbacks.size > 0) {
      callbacks.forEach((callback) => {
        try {
          callback(message.data)
        } catch (error) {
          devLog.error('[WebSocket] Callback error for channel', channel, error)
        }
      })
    }
  }

  private handleServerError(message: ErrorMessage): void {
    devLog.error('[WebSocket] Server error:', message.data)

    const requestId = message.request_id
    if (requestId && this.pendingRequests.has(requestId)) {
      this.pendingRequests.get(requestId)!.reject(new Error(message.data.message))
      this.pendingRequests.delete(requestId)
    }

    // Handle specific error codes — log as warning, not error
    // FORBIDDEN on channel subscribe is common during page transitions
    if (message.data.code === 'FORBIDDEN' || message.data.code === 'UNAUTHORIZED') {
      devLog.warn('[WebSocket] Auth error on channel:', message.data.message)
    }
  }

  private handleError(error: Error): void {
    this.setState('error')
    this.config.onError?.(error)
    this.scheduleReconnect()
  }

  private scheduleReconnect(): void {
    // Check max attempts
    if (
      this.config.maxReconnectAttempts > 0 &&
      this.reconnectAttempts >= this.config.maxReconnectAttempts
    ) {
      devLog.error('[WebSocket] Max reconnect attempts reached')
      this.setState('error')
      this.config.onError?.(new Error('Max reconnect attempts reached'))
      return
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.initialReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.config.maxReconnectDelay
    )
    this.reconnectAttempts++

    devLog.log(
      `[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts || 'unlimited'})`
    )

    this.setState('reconnecting')

    this.reconnectTimeout = setTimeout(() => {
      this.createConnection()
    }, delay)
  }

  private resubscribeAll(): void {
    // Re-subscribe to all channels after reconnect
    for (const channel of this.subscriptions.keys()) {
      const request: SubscribeRequest = {
        type: 'subscribe',
        channel,
        request_id: this.generateRequestId(),
      }
      this.send(request)
    }
  }

  private startPingInterval(): void {
    this.pingTimeout = setInterval(() => {
      if (this.state === 'connected') {
        this.send({ type: 'ping' })

        // Set pong timeout
        this.pongTimeout = setTimeout(() => {
          devLog.warn('[WebSocket] Pong timeout, reconnecting...')
          this.ws?.close()
        }, this.config.pongTimeout)
      }
    }, this.config.pingInterval)
  }

  private clearTimers(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    if (this.pingTimeout) {
      clearInterval(this.pingTimeout)
      this.pingTimeout = null
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout)
      this.pongTimeout = null
    }
  }

  private send(data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      devLog.log('[DEBUG WS] Sending payload:', JSON.stringify(data))
      this.ws.send(JSON.stringify(data))
    }
  }

  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state
      this.config.onStateChange?.(state)
    }
  }

  private generateRequestId(): string {
    return `req-${++this.requestIdCounter}-${Date.now()}`
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let globalClient: WebSocketClient | null = null

/**
 * Get or create the global WebSocket client instance
 */
export function getWebSocketClient(config?: WebSocketClientConfig): WebSocketClient {
  if (!globalClient && config) {
    globalClient = new WebSocketClient(config)
  }
  if (!globalClient) {
    throw new Error('WebSocket client not initialized. Call initWebSocketClient first.')
  }
  return globalClient
}

/**
 * Initialize the global WebSocket client
 */
export function initWebSocketClient(config: WebSocketClientConfig): WebSocketClient {
  if (globalClient) {
    globalClient.disconnect()
  }
  globalClient = new WebSocketClient(config)
  return globalClient
}

/**
 * Destroy the global WebSocket client
 */
export function destroyWebSocketClient(): void {
  if (globalClient) {
    globalClient.disconnect()
    globalClient = null
  }
}
