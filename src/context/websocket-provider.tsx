'use client'

/**
 * WebSocket Provider
 *
 * Provides global WebSocket connection for real-time updates.
 * For cross-origin connections (dev), fetches token via Next.js API route.
 *
 * OPTIMIZATION: Pre-fetches token during module load to minimize connection delay.
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

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_WS_BASE_URL || env.api.wsBaseUrl || window.location.origin

  const wsProtocol = apiBaseUrl.startsWith('https') ? 'wss' : 'ws'
  const wsHost = apiBaseUrl.replace(/^https?:\/\//, '')
  return `${wsProtocol}://${wsHost}/api/v1/ws`
}

function isCrossOrigin(): boolean {
  if (typeof window === 'undefined') return false

  const apiBaseUrl = process.env.NEXT_PUBLIC_WS_BASE_URL || env.api.wsBaseUrl || ''
  if (!apiBaseUrl) return false

  try {
    const wsUrl = new URL(apiBaseUrl)
    const currentUrl = new URL(window.location.origin)
    return wsUrl.host !== currentUrl.host
  } catch {
    return false
  }
}

// ============================================
// TOKEN CACHE (module-level for fast access)
// ============================================

let cachedToken: string | null = null
let tokenFetchPromise: Promise<string | null> | null = null

/** Fetch and cache token for cross-origin WebSocket connections */
async function fetchToken(): Promise<string | null> {
  // Return cached token if available
  if (cachedToken) {
    console.log('[WebSocket] Using cached token')
    return cachedToken
  }

  // Return existing promise if fetch is in progress
  if (tokenFetchPromise) {
    console.log('[WebSocket] Token fetch in progress, waiting...')
    return tokenFetchPromise
  }

  // Start new fetch
  console.log('[WebSocket] Fetching token from /api/ws-token')
  tokenFetchPromise = (async () => {
    try {
      const res = await fetch('/api/ws-token')
      if (!res.ok) {
        const errorBody = await res.text()
        console.error('[WebSocket] Failed to get token:', res.status, errorBody)
        return null
      }
      const { token } = await res.json()
      console.log('[WebSocket] Token fetched successfully, length:', token?.length)
      cachedToken = token
      return token
    } catch (error) {
      console.error('[WebSocket] Token fetch error:', error)
      return null
    } finally {
      tokenFetchPromise = null
    }
  })()

  return tokenFetchPromise
}

/** Clear cached token (call on logout) */
export function clearWebSocketToken(): void {
  cachedToken = null
  tokenFetchPromise = null
}

// Start pre-fetching token AND connecting immediately if cross-origin
// This runs during module load, before React renders
let earlyConnectionPromise: Promise<void> | null = null

if (typeof window !== 'undefined' && isCrossOrigin()) {
  console.log('[WebSocket] Pre-fetching token (module load)')
  earlyConnectionPromise = (async () => {
    const token = await fetchToken()
    if (token) {
      console.log('[WebSocket] Token ready, can connect immediately when provider mounts')
    }
  })()
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
      console.log('[WebSocket] Already connecting, skipping')
      return
    }

    const wsUrl = buildWsUrl()
    const crossOrigin = isCrossOrigin()

    console.log('[WebSocket] Connect called', { wsUrl: !!wsUrl, crossOrigin })

    if (!wsUrl) {
      console.log('[WebSocket] No WebSocket URL available')
      return
    }

    if (clientRef.current?.isConnected()) {
      console.log('[WebSocket] Already connected')
      return
    }

    connectingRef.current = true

    try {
      let finalUrl = wsUrl

      // For cross-origin, get token (from cache or fetch)
      if (crossOrigin) {
        console.log('[WebSocket] Cross-origin detected, fetching token...')
        const token = await fetchToken()
        if (!token) {
          console.error('[WebSocket] No token available - cannot connect')
          return
        }
        finalUrl = `${wsUrl}?token=${token}`
        console.log('[WebSocket] Token obtained, URL ready')
      }

      console.log('[WebSocket] Initializing client and connecting to', wsUrl)

      clientRef.current = initWebSocketClient({
        url: finalUrl,
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

  // Connect immediately on mount (no dependency on tenant - token contains tenant info)
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    console.log('[WebSocket] Provider mounted, connecting...')
    connect()

    return () => {
      console.log('[WebSocket] Cleanup')
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
