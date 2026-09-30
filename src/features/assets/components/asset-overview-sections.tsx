/**
 * Asset Detail Sheet - Overview sections
 *
 * The Overview tab used to render only description, owner reference and tags,
 * so most assets showed "No tags" and nothing else even though the API returns
 * risk, severity breakdown, ownership, discovery and classification data. These
 * sections render that data for every asset type; per-type pages can still add
 * their own content on top via `overviewContent`.
 */

'use client'

import * as React from 'react'
import { AlertTriangle, Gauge, ListTree, Radar, ShieldHalf, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DetailSection,
  DetailField,
  DetailFieldGrid,
  RelativeTime,
  RiskScoreBadge,
  SeverityStrip,
} from '@/features/shared'
import type { Asset } from '../types/asset.types'

// Assets not observed for this long are flagged as possibly stale.
const STALE_AFTER_DAYS = 30

function humanize(value: string): string {
  const words = value.replace(/[-_]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function daysSince(iso?: string): number | undefined {
  if (!iso) return undefined
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return undefined
  const diff = Date.now() - t
  return diff < 0 ? undefined : Math.floor(diff / 86_400_000)
}

function DateWithRelative({ iso }: { iso?: string }) {
  if (!iso) return null
  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5">
      <span>{new Date(iso).toLocaleString()}</span>
      <RelativeTime date={iso} className="text-xs text-muted-foreground" />
    </span>
  )
}

// ============================================
// Risk
// ============================================

interface RiskSummarySectionProps {
  asset: Asset
  /** Switches the sheet to its Findings tab. Omit to hide the link. */
  onViewFindings?: () => void
}

/** Risk score plus the open-finding breakdown by severity. */
export function RiskSummarySection({ asset, onViewFindings }: RiskSummarySectionProps) {
  const counts = asset.findingSeverityCounts ?? {}
  const hasFindings = asset.findingCount > 0

  return (
    <DetailSection
      title="Risk"
      icon={Gauge}
      actions={
        hasFindings && onViewFindings ? (
          <Button variant="link" size="sm" className="h-auto p-0" onClick={onViewFindings}>
            View findings
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Risk score</p>
          <RiskScoreBadge score={asset.riskScore} size="md" />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Open findings</p>
          <p className="text-lg leading-none font-semibold tabular-nums">{asset.findingCount}</p>
        </div>
      </div>
      {hasFindings ? (
        <SeverityStrip counts={counts} className="mt-4" />
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No open findings on this asset.</p>
      )}
    </DetailSection>
  )
}

// ============================================
// Ownership
// ============================================

interface OwnershipSectionProps {
  asset: Asset
  /** Switches to the Owners tab when the sheet has one. */
  onManageOwners?: () => void
}

/**
 * Primary owner + free-text owner reference. An asset with neither is called
 * out: CTEM mobilization depends on every exposure having someone to route to.
 */
export function OwnershipSection({ asset, onManageOwners }: OwnershipSectionProps) {
  const owner = asset.primaryOwner
  const hasOwner = !!owner || !!asset.ownerRef

  return (
    <DetailSection
      title="Ownership"
      icon={UserRound}
      actions={
        onManageOwners ? (
          <Button variant="link" size="sm" className="h-auto p-0" onClick={onManageOwners}>
            {hasOwner ? 'Manage owners' : 'Assign owner'}
          </Button>
        ) : undefined
      }
    >
      {hasOwner ? (
        <DetailFieldGrid>
          {owner && (
            <DetailField label={owner.type === 'group' ? 'Owning team' : 'Primary owner'}>
              <span className="block">{owner.name}</span>
              {owner.email && (
                <span className="block text-xs text-muted-foreground">{owner.email}</span>
              )}
            </DetailField>
          )}
          <DetailField label="Owner reference">{asset.ownerRef}</DetailField>
        </DetailFieldGrid>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          No owner assigned. Findings on this asset have no one to be routed to.
        </p>
      )}
    </DetailSection>
  )
}

// ============================================
// Exposure & data
// ============================================

interface ExposureSectionProps {
  asset: Asset
  /** Derived from relationships: the asset is the target of a control-plane edge. */
  isControlPlane?: boolean
}

function yesNo(value: boolean | undefined): string | undefined {
  if (value === undefined) return undefined
  return value ? 'Yes' : 'No'
}

/** Reachability and data sensitivity: the context that weighs a finding's impact. */
export function ExposureSection({ asset, isControlPlane }: ExposureSectionProps) {
  const sensitive = [asset.piiDataExposed && 'PII', asset.phiDataExposed && 'PHI'].filter(
    Boolean
  ) as string[]
  const sensitivityKnown = asset.piiDataExposed !== undefined || asset.phiDataExposed !== undefined

  return (
    <DetailSection title="Exposure and data" icon={ShieldHalf}>
      <DetailFieldGrid>
        <DetailField label="Internet-facing">{yesNo(asset.isInternetAccessible)}</DetailField>
        <DetailField label="Network exposure">
          {asset.exposure ? humanize(asset.exposure) : undefined}
        </DetailField>
        <DetailField label="Control plane">
          {isControlPlane ? 'Yes, other assets depend on it for security' : undefined}
        </DetailField>
        <DetailField label="Data classification">
          {asset.dataClassification ? humanize(asset.dataClassification) : undefined}
        </DetailField>
        <DetailField label="Sensitive data exposed">
          {sensitivityKnown
            ? sensitive.length
              ? sensitive.join(', ')
              : 'None flagged'
            : undefined}
        </DetailField>
        <DetailField label="Compliance scope" full>
          {asset.complianceScope?.length ? (
            <span className="flex flex-wrap gap-1">
              {asset.complianceScope.map((c) => (
                <Badge key={c} variant="outline" className="font-normal">
                  {c}
                </Badge>
              ))}
            </span>
          ) : undefined}
        </DetailField>
      </DetailFieldGrid>
    </DetailSection>
  )
}

// ============================================
// Discovery
// ============================================

/** Where the asset came from and how fresh the observation is. */
export function DiscoverySection({ asset }: { asset: Asset }) {
  const staleDays = daysSince(asset.lastSeen)
  const isStale = staleDays !== undefined && staleDays >= STALE_AFTER_DAYS

  return (
    <DetailSection title="Discovery" icon={Radar}>
      <DetailFieldGrid>
        <DetailField label="Source">
          {asset.discoverySource ? humanize(asset.discoverySource) : undefined}
        </DetailField>
        <DetailField label="Discovered by">{asset.discoveryTool}</DetailField>
        <DetailField label="First seen">
          <DateWithRelative iso={asset.firstSeen || asset.discoveredAt} />
        </DetailField>
        <DetailField label="Last seen">
          <DateWithRelative iso={asset.lastSeen} />
        </DetailField>
        <DetailField label="Sync status">
          {asset.syncStatus ? humanize(asset.syncStatus) : undefined}
        </DetailField>
        <DetailField label="Last synced">
          {asset.lastSyncedAt ? <DateWithRelative iso={asset.lastSyncedAt} /> : undefined}
        </DetailField>
      </DetailFieldGrid>
      {isStale && (
        <p className="mt-3 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Not observed for {staleDays} days. Its findings may be out of date; rescan to confirm.
        </p>
      )}
    </DetailSection>
  )
}

// ============================================
// Properties
// ============================================

function formatValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number' || typeof value === 'string') return String(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return undefined
    if (value.every((v) => ['string', 'number', 'boolean'].includes(typeof v))) {
      return value.join(', ')
    }
  }
  return <code className="font-mono text-xs break-all">{JSON.stringify(value)}</code>
}

/**
 * Type-specific attributes the scanner or integration recorded (asset
 * `properties`). Rendered generically so every asset type shows what the API
 * actually holds instead of nothing.
 */
export function PropertiesSection({ properties }: { properties?: Record<string, unknown> }) {
  const entries = Object.entries(properties ?? {})
    .map(([k, v]) => [k, formatValue(v)] as const)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))

  if (entries.length === 0) return null

  return (
    <DetailSection title="Properties" icon={ListTree} count={entries.length}>
      <DetailFieldGrid>
        {entries.map(([key, value]) => (
          <DetailField key={key} label={humanize(key)}>
            {value}
          </DetailField>
        ))}
      </DetailFieldGrid>
    </DetailSection>
  )
}
