/**
 * WebSocket Hook
 *
 * A React hook for managing WebSocket connections with automatic
 * reconnection, subscription management, and state tracking.
 */

'use client'

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import {
  WebSocketClient,
  initWebSocketClient,
  destroyWebSocketClient,
  type ConnectionState,
  type ChannelType,
  makeChannel,
} from '@/lib/websocket'
import { env } from '@/lib/env'

// ============================================
// TYPES
// ============================================

interface UseWebSocketOptions {
  /** Whether to auto-connect on mount (default: true) */
  autoConnect?: boolean
  /** Authentication token */
  token?: string
  /** Callback when connection state changes */
  onStateChange?: (state: ConnectionState) => void
  /** Callback when an error occurs */
  onError?: (error: Error) => void
}

interface UseWebSocketReturn {
  /** Current connection state */
  state: ConnectionState
  /** Whether currently connected */
  isConnected: boolean
  /** Connect to WebSocket server */
  connect: () => void
  /** Disconnect from WebSocket server */
  disconnect: () => void
  /** Subscribe to a channel */
  subscribe: <T = unknown>(channel: string, callback: (data: T) => void) => Promise<void>
  /** Unsubscribe from a channel */
  unsubscribe: (channel: string, callback?: (data: unknown) => void) => Promise<void>
  /** Update authentication token */
  updateToken: (token: string) => void
}

// ============================================
// WEBSOCKET PROVIDER HOOK
// ============================================

/**
 * Hook to manage the global WebSocket connection.
 * Should be called once at the app level (e.g., in providers.tsx).
 */
export function useWebSocketProvider(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { autoConnect = true, token, onStateChange, onError } = options

  const [state, setState] = useState<ConnectionState>('disconnected')
  const clientRef = useRef<WebSocketClient | null>(null)

  // Build WebSocket URL
  const wsUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''

    // Use WebSocket base URL (direct backend connection bypassing proxy)
    // Or fall back to window origin
    const apiBaseUrl = env.api.wsBaseUrl || window.location.origin
    const wsProtocol = apiBaseUrl.startsWith('https') ? 'wss' : 'ws'
    const wsHost = apiBaseUrl.replace(/^https?:\/\//, '')
    return `${wsProtocol}://${wsHost}/api/v1/ws`
  }, [])

  // Initialize client
  useEffect(() => {
    if (!wsUrl) return

    clientRef.current = initWebSocketClient({
      url: wsUrl,
      token,
      onStateChange: (newState) => {
        setState(newState)
        onStateChange?.(newState)
      },
      onError,
    })

    if (autoConnect && token) {
      clientRef.current.connect()
    }

    return () => {
      destroyWebSocketClient()
    }
  }, [wsUrl, token, autoConnect, onStateChange, onError])

  // Connection methods
  const connect = useCallback(() => {
    clientRef.current?.connect()
  }, [])

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect()
  }, [])

  const subscribe = useCallback(
    async <T = unknown>(channel: string, callback: (data: T) => void) => {
      await clientRef.current?.subscribe(channel, callback)
    },
    []
  )

  const unsubscribe = useCallback(async (channel: string, callback?: (data: unknown) => void) => {
    await clientRef.current?.unsubscribe(channel, callback)
  }, [])

  const updateToken = useCallback((newToken: string) => {
    clientRef.current?.updateToken(newToken)
  }, [])

  return {
    state,
    isConnected: state === 'connected',
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    updateToken,
  }
}

// ============================================
// CHANNEL SUBSCRIPTION HOOK
// ============================================

interface UseChannelOptions<T> {
  /** Channel type (e.g., 'finding', 'scan') */
  channelType: ChannelType
  /** Channel ID (e.g., finding ID, scan ID) */
  channelId: string | null
  /** Whether the subscription is enabled (default: true) */
  enabled?: boolean
  /** Callback when data is received */
  onData?: (data: T) => void
}

interface UseChannelReturn<T> {
  /** Latest data received from the channel */
  data: T | null
  /** Whether currently subscribed */
  isSubscribed: boolean
  /** Clear the current data */
  clearData: () => void
}

/**
 * Hook to subscribe to a specific WebSocket channel.
 * Automatically subscribes when the channel changes and unsubscribes on unmount.
 *
 * @example
 * ```tsx
 * const { data, isSubscribed } = useChannel<ActivityEventData>({
 *   channelType: 'finding',
 *   channelId: findingId,
 *   onData: (activity) => {
 *     // Handle new activity
 *     mutateActivities()
 *   }
 * })
 * ```
 */
export function useChannel<T = unknown>(options: UseChannelOptions<T>): UseChannelReturn<T> {
  const { channelType, channelId, enabled = true, onData } = options

  const [data, setData] = useState<T | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const callbackRef = useRef(onData)

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onData
  }, [onData])

  // Subscribe/unsubscribe when channel changes
  useEffect(() => {
    if (!enabled || !channelId) {
      setIsSubscribed(false)
      return
    }

    const channel = makeChannel(channelType, channelId)

    // Get the global client (if initialized)
    let client: WebSocketClient | null = null
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getWebSocketClient } = require('@/lib/websocket')
      client = getWebSocketClient()
    } catch {
      // Client not initialized yet
      console.log('[useChannel] WebSocket client not initialized')
      return
    }

    if (!client) return

    const handleData = (eventData: T) => {
      setData(eventData)
      callbackRef.current?.(eventData)
    }

    // Subscribe
    client
      .subscribe<T>(channel, handleData)
      .then(() => {
        setIsSubscribed(true)
      })
      .catch((error) => {
        console.error('[useChannel] Subscribe error:', error)
        setIsSubscribed(false)
      })

    // Cleanup: unsubscribe
    return () => {
      client?.unsubscribe(channel, handleData).catch(() => {
        // Ignore unsubscribe errors on cleanup
      })
      setIsSubscribed(false)
    }
  }, [channelType, channelId, enabled])

  const clearData = useCallback(() => {
    setData(null)
  }, [])

  return {
    data,
    isSubscribed,
    clearData,
  }
}

// ============================================
// CONVENIENCE HOOKS
// ============================================

/**
 * Hook to subscribe to finding activity updates
 */
export function useFindingChannel<T = unknown>(
  findingId: string | null,
  options: { enabled?: boolean; onData?: (data: T) => void } = {}
) {
  return useChannel<T>({
    channelType: 'finding',
    channelId: findingId,
    ...options,
  })
}

/**
 * Hook to subscribe to scan progress updates
 */
export function useScanChannel<T = unknown>(
  scanId: string | null,
  options: { enabled?: boolean; onData?: (data: T) => void } = {}
) {
  return useChannel<T>({
    channelType: 'scan',
    channelId: scanId,
    ...options,
  })
}

/**
 * Hook to subscribe to AI triage updates
 */
export function useTriageChannel<T = unknown>(
  findingId: string | null,
  options: { enabled?: boolean; onData?: (data: T) => void } = {}
) {
  return useChannel<T>({
    channelType: 'triage',
    channelId: findingId,
    ...options,
  })
}

/**
 * Hook to subscribe to tenant-wide notifications
 */
export function useTenantChannel<T = unknown>(
  tenantId: string | null,
  options: { enabled?: boolean; onData?: (data: T) => void } = {}
) {
  return useChannel<T>({
    channelType: 'tenant',
    channelId: tenantId,
    ...options,
  })
}

// Re-export types for convenience
export type { ConnectionState } from '@/lib/websocket'
