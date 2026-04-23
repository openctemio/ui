'use client'

/**
 * WebSocket Provider
 *
 * Provides global WebSocket connection for real-time updates.
 *
 * Authentication (F-8 ticket flow):
 *   1. Before each connect/reconnect, call GET /api/v1/auth/ws-token
 *      (same-origin, auth_token cookie flows automatically).
 *   2. Backend returns an opaque 64-hex ticket stored single-use in Redis.
 *   3. Client opens the WebSocket with `?ticket=<value>`; server atomically
 *      redeems (GETDEL) and promotes the claim to a user/tenant context.
 *
 * Why tickets instead of cookies? Browsers silently strip cookie-based auth
 * on cross-port WS upgrades in some configurations, and putting JWTs in the
 * URL leaks into access logs. Tickets are useless after redemption.
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import {
  WebSocketClient,
  initWebSocketClient,
  destroyWebSocketClient,
  type ConnectionState,
} from '@/lib/websocket'
import { useBootstrapContextSafe } from '@/context/bootstrap-provider'
import { devLog } from '@/lib/logger'
import { env } from '@/lib/env'

// ============================================
// CONTEXT
// ============================================

interface WebSocketContextValue {
  /** Current connection state */
  state: ConnectionState
  /** Whether WebSocket is connected */
  isConnected: boolean
  /** Reconnect manually */
  reconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

// ============================================
// HELPERS
// ============================================

function buildWsUrl(): string {
  if (typeof window === 'undefined') return ''

  // Priority: explicit WS URL > derive from current hostname + API port
  const explicitUrl = process.env.NEXT_PUBLIC_WS_BASE_URL || env.api.wsBaseUrl
  if (explicitUrl) {
    const wsProtocol = explicitUrl.startsWith('https') ? 'wss' : 'ws'
    const wsHost = explicitUrl.replace(/^https?:\/\//, '')
    return `${wsProtocol}://${wsHost}/api/v1/ws`
  }

  // No explicit WS URL — connect directly to API server.
  // In Docker dev: UI is on port 80, API is on port 8080, same host.
  // Auth is carried by a single-use ticket (see fetchWsTicket below), not
  // by cookies — cross-port WS upgrades cannot rely on cookie flow.
  const apiPort = process.env.NEXT_PUBLIC_API_PORT || '8080'
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${wsProtocol}://${window.location.hostname}:${apiPort}/api/v1/ws`
}

/**
 * Fetches a fresh single-use WebSocket ticket from the API proxy.
 * The proxy (app/api/v1/[...path]) forwards the access-token cookie as a
 * Bearer Authorization header so the handler can authenticate the issue.
 *
 * Called lazily inside the WS client on every (re)connect — tickets are
 * consumed on first redemption and have a short TTL (~30s) by design.
 */
async function fetchWsTicket(): Promise<string> {
  const resp = await fetch('/api/v1/auth/ws-token', {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!resp.ok) {
    throw new Error(`ws-token fetch failed: ${resp.status}`)
  }
  const body = (await resp.json()) as { token?: string }
  if (!body.token) {
    throw new Error('ws-token response missing token')
  }
  return body.token
}

// ============================================
// PROVIDER
// ============================================

interface WebSocketProviderProps {
  children: React.ReactNode
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [state, setState] = useState<ConnectionState>('disconnected')
  const clientRef = useRef<WebSocketClient | null>(null)
  const connectingRef = useRef(false)
  const { isBootstrapped } = useBootstrapContextSafe()

  const connect = useCallback(async () => {
    if (connectingRef.current) {
      return
    }

    const wsUrl = buildWsUrl()

    if (!wsUrl) {
      devLog.log('[WebSocket] No WebSocket URL available')
      return
    }

    if (clientRef.current?.isConnected()) {
      return
    }

    connectingRef.current = true

    try {
      devLog.log('[WebSocket] Connecting to', wsUrl)

      clientRef.current = initWebSocketClient({
        url: wsUrl,
        // F-8: mint a fresh ticket per (re)connect. The client awaits this
        // before opening the socket.
        fetchTicket: fetchWsTicket,
        onStateChange: (newState) => {
          devLog.log('[WebSocket] State changed:', newState)
          setState(newState)
        },
        onError: (error) => devLog.error('[WebSocket] Connection error:', error),
      })

      clientRef.current.connect()
    } catch (error) {
      devLog.error('[WebSocket] Connect failed:', error)
    } finally {
      connectingRef.current = false
    }
  }, [])

  // Connect only after bootstrap is complete (permissions/tenant context ready)
  // This prevents "Access denied to channel" errors during initial load
  useEffect(() => {
    if (!isBootstrapped) return

    connect()

    return () => {
      destroyWebSocketClient()
      clientRef.current = null
    }
  }, [isBootstrapped, connect])

  const value: WebSocketContextValue = {
    state,
    isConnected: state === 'connected',
    reconnect: connect,
  }

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}

// ============================================
// HOOK
// ============================================

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    return {
      state: 'disconnected' as ConnectionState,
      isConnected: false,
      reconnect: () => {},
    }
  }
  return context
}
