/**
 * Credential API Mapper
 *
 * Maps API response to frontend types for compatibility with existing UI components
 */

import type { ApiCredential, ApiCredentialStats } from '../api/credential-api.types'
import type { Asset } from '@/features/assets'
import type { Status } from '@/features/shared/types'

// Map API state to frontend status
const stateToStatus: Record<string, Status> = {
  active: 'active',
  resolved: 'completed',
  accepted: 'inactive',
  false_positive: 'inactive',
}

// Map API severity to risk score
const severityToRiskScore: Record<string, number> = {
  critical: 95,
  high: 80,
  medium: 55,
  low: 30,
  info: 10,
}

/**
 * Map API credential to Asset type for UI compatibility
 */
export function mapCredentialToAsset(credential: ApiCredential): Asset {
  const details = credential.details || {}

  // Extract context from details
  const username = (details.username as string) || ''
  const email = (details.email as string) || ''

  // Determine credential type display name
  const credTypeMap: Record<string, string> = {
    password: 'Password',
    api_key: 'API Key',
    oauth_token: 'OAuth Token',
    ssh_key: 'SSH Key',
    private_key: 'Private Key',
    database_cred: 'Database Credential',
    cloud_cred: 'Cloud Credential',
    session_token: 'Session Token',
    jwt_token: 'JWT Token',
    certificate: 'Certificate',
    other: 'Other',
  }

  return {
    id: credential.id,
    type: 'credential',
    name: credential.identifier,
    description: `${credential.credential_type} from ${credential.source}`,
    criticality: credential.severity === 'critical' || credential.severity === 'high' ? 'critical' : 'high',
    status: stateToStatus[credential.state] || 'active',
    scope: 'internal',
    exposure: 'public',
    riskScore: severityToRiskScore[credential.severity] || 50,
    findingCount: 1,
    metadata: {
      source: credential.source,
      username: username || email,
      leakDate: credential.first_seen_at?.split('T')[0] || '',
      secretValue: credential.secret_value,
      credentialType: credTypeMap[credential.credential_type] || credential.credential_type,
    },
    tags: [],
    firstSeen: credential.first_seen_at,
    lastSeen: credential.last_seen_at,
    createdAt: credential.first_seen_at,
    updatedAt: credential.last_seen_at,
  }
}

/**
 * Map multiple API credentials to Assets
 */
export function mapCredentialsToAssets(credentials: ApiCredential[]): Asset[] {
  return credentials.map(mapCredentialToAsset)
}

/**
 * Extract stats from API response
 */
export function extractCredentialStats(stats: ApiCredentialStats | undefined) {
  if (!stats) {
    return {
      total: 0,
      active: 0,
      resolved: 0,
      accepted: 0,
      falsePositive: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }
  }

  return {
    total: stats.total,
    active: stats.by_state?.active || 0,
    resolved: stats.by_state?.resolved || 0,
    accepted: stats.by_state?.accepted || 0,
    falsePositive: stats.by_state?.false_positive || 0,
    critical: stats.by_severity?.critical || 0,
    high: stats.by_severity?.high || 0,
    medium: stats.by_severity?.medium || 0,
    low: stats.by_severity?.low || 0,
  }
}
