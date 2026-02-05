/**
 * WebSocket Types
 *
 * TypeScript types for WebSocket communication with the backend.
 * Mirrors the types defined in api/internal/infra/websocket/types.go
 */

// ============================================
// MESSAGE TYPES
// ============================================

/** Message types sent from client to server */
export type ClientMessageType = 'subscribe' | 'unsubscribe' | 'ping'

/** Message types sent from server to client */
export type ServerMessageType = 'subscribed' | 'unsubscribed' | 'event' | 'error' | 'pong'

/** All possible message types */
export type MessageType = ClientMessageType | ServerMessageType

// ============================================
// CHANNEL TYPES
// ============================================

/**
 * Channel types for WebSocket subscriptions
 * Format: {type}:{id}
 */
export type ChannelType =
  | 'finding' // finding:{id} - Activity updates for a finding
  | 'scan' // scan:{id} - Scan progress updates
  | 'tenant' // tenant:{id} - Tenant-wide notifications
  | 'notification' // notification:{tenant_id} - Notification delivery
  | 'triage' // triage:{finding_id} - AI triage progress

/**
 * Create a channel string from type and ID
 */
export function makeChannel(type: ChannelType, id: string): string {
  return `${type}:${id}`
}

/**
 * Parse a channel string into type and ID
 */
export function parseChannel(channel: string): { type: ChannelType; id: string } | null {
  const colonIndex = channel.indexOf(':')
  if (colonIndex === -1) return null
  return {
    type: channel.substring(0, colonIndex) as ChannelType,
    id: channel.substring(colonIndex + 1),
  }
}

// ============================================
// MESSAGE STRUCTURES
// ============================================

/** Base message structure */
export interface WebSocketMessage {
  type: MessageType
  channel?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any
  timestamp: number
  request_id?: string
}

/** Subscribe request from client */
export interface SubscribeRequest {
  type: 'subscribe'
  channel: string
  request_id?: string
}

/** Unsubscribe request from client */
export interface UnsubscribeRequest {
  type: 'unsubscribe'
  channel: string
  request_id?: string
}

/** Ping request from client */
export interface PingRequest {
  type: 'ping'
}

/** Subscribed confirmation from server */
export interface SubscribedResponse {
  type: 'subscribed'
  channel: string
  timestamp: number
  request_id?: string
}

/** Unsubscribed confirmation from server */
export interface UnsubscribedResponse {
  type: 'unsubscribed'
  channel: string
  timestamp: number
  request_id?: string
}

/** Event from server */
export interface EventMessage<T = unknown> {
  type: 'event'
  channel: string
  data: T
  timestamp: number
}

/** Error from server */
export interface ErrorMessage {
  type: 'error'
  data: {
    code: string
    message: string
  }
  timestamp: number
  request_id?: string
}

/** Pong response from server */
export interface PongResponse {
  type: 'pong'
  timestamp: number
}

// ============================================
// CONNECTION STATES
// ============================================

/**
 * WebSocket connection states
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'

// ============================================
// EVENT DATA TYPES
// ============================================

/** Activity event data from finding channel */
export interface ActivityEventData {
  type: 'activity_created'
  activity: {
    id: string
    finding_id: string
    tenant_id: string
    activity_type: string
    actor_id?: string
    actor_type: string
    actor_name?: string
    actor_email?: string
    changes?: Record<string, unknown>
    created_at: string
  }
}

/** AI Triage event data */
export interface TriageEventData {
  type: 'triage_started' | 'triage_progress' | 'triage_completed' | 'triage_failed'
  finding_id: string
  status?: string
  progress?: number
  result?: {
    severity?: string
    priority?: string
    analysis?: string
  }
  error?: string
}

/** Scan progress event data */
export interface ScanEventData {
  type: 'scan_started' | 'scan_progress' | 'scan_completed' | 'scan_failed'
  scan_id: string
  status?: string
  progress?: number
  findings_count?: number
  error?: string
}
