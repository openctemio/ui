'use client'

/**
 * WebSocket Provider
 *
 * Provides global WebSocket connection for real-time updates.
 * Authentication uses httpOnly cookies — browser automatically sends
 * the auth_token cookie during WebSocket handshake (same domain, any port).
 * No need for token query params or extra API calls.
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import {
  WebSocketClient,
  initWebSocketClient,
  destroyWebSocketClient,
  type ConnectionState,
} from '@/lib/websocket'
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
  // Browser sends auth_token cookie automatically (same domain, SameSite=Lax).
  const apiPort = process.env.NEXT_PUBLIC_API_PORT || '8080'
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${wsProtocol}://${window.location.hostname}:${apiPort}/api/v1/ws`
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
  const mountedRef = useRef(false)

  const connect = useCallback(async () => {
    if (connectingRef.current) {
      return
    }

    const wsUrl = buildWsUrl()

    if (!wsUrl) {
      console.log('[WebSocket] No WebSocket URL available')
      return
    }

    if (clientRef.current?.isConnected()) {
      return
    }

    connectingRef.current = true

    try {
      console.log('[WebSocket] Connecting to', wsUrl)

      clientRef.current = initWebSocketClient({
        url: wsUrl,
        onStateChange: (newState) => {
          console.log('[WebSocket] State changed:', newState)
          setState(newState)
        },
        onError: (error) => console.error('[WebSocket] Connection error:', error),
      })

      clientRef.current.connect()
    } catch (error) {
      console.error('[WebSocket] Connect failed:', error)
    } finally {
      connectingRef.current = false
    }
  }, [])

  // Connect immediately on mount
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    connect()

    return () => {
      destroyWebSocketClient()
      clientRef.current = null
    }
  }, [connect])

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
