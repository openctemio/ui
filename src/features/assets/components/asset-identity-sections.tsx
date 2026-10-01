'use client'

/**
 * Asset identity sections: the identifiers the platform matches this asset
 * on, the other names it is known by, and its renames. One component, used by
 * every asset detail surface (the detail sheet and /assets/{id}).
 */

import { ArrowRight, Fingerprint, History, Tags } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DetailSection, EmptyState, RelativeTime } from '@/features/shared'
import { useAssetIdentifiers, useAssetRenames } from '../hooks/use-asset-identity'
import {
  deriveAlsoKnownAs,
  identifierKindLabel,
  isUsedForMatching,
  readAliases,
  sortIdentifiers,
  WEAK_IDENTIFIER_WINDOW_DAYS,
} from '../lib/asset-identity'

interface AssetIdentitySectionsProps {
  assetId: string
  assetName: string
  /** The asset's properties; `aliases` holds names it had before a rename. */
  properties?: Record<string, unknown> | null
}

const SOURCE_LABEL: Record<string, string> = {
  scan: 'Scan',
  manual: 'Manual',
  system: 'System',
  sensor: 'Sensor',
  integration: 'Integration',
  api: 'API',
}

function SectionSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
    </div>
  )
}

function compactEmpty(icon: typeof Fingerprint, title: string, description: string) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      card={false}
      className="py-4 [&>p:first-of-type]:text-sm [&>svg]:mb-2 [&>svg]:h-6 [&>svg]:w-6"
    />
  )
}

/** Renders three DetailSections; place it inside a <DetailSections>. */
export function AssetIdentitySections({
  assetId,
  assetName,
  properties,
}: AssetIdentitySectionsProps) {
  const { identifiers, isLoading: idLoading, error: idError } = useAssetIdentifiers(assetId)
  const { renames, isLoading: renLoading, error: renError } = useAssetRenames(assetId)

  const sorted = sortIdentifiers(identifiers)
  const aka = deriveAlsoKnownAs(identifiers, assetName, readAliases(properties))

  return (
    <>
      <DetailSection title="Also known as" icon={Tags} count={aka.length || undefined}>
        {idLoading ? (
          <SectionSkeleton />
        ) : aka.length === 0 ? (
          compactEmpty(Tags, 'No other names', 'Other hostnames, FQDNs and IPs appear here.')
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {aka.map((n) => (
              <li key={`${n.kind}:${n.name}`}>
                <Badge variant="secondary" className="gap-1 font-normal">
                  <span className="font-mono text-xs">{n.name}</span>
                  <span className="text-muted-foreground text-[10px]">
                    {n.kind === 'alias' ? 'former name' : identifierKindLabel(n.kind)}
                  </span>
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title="Identifiers" icon={Fingerprint} count={sorted.length || undefined}>
        {idLoading ? (
          <SectionSkeleton />
        ) : idError ? (
          <p className="text-sm text-muted-foreground">Identifiers could not be loaded.</p>
        ) : sorted.length === 0 ? (
          compactEmpty(
            Fingerprint,
            'No identifiers recorded',
            'Host IDs, MAC addresses and other stable identifiers appear after the next scan.'
          )
        ) : (
          <ul className="divide-y rounded-md border">
            {sorted.map((id) => {
              const active = isUsedForMatching(id)
              return (
                <li
                  key={`${id.kind}:${id.value}`}
                  className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-medium">{identifierKindLabel(id.kind)}</span>
                      <Badge
                        variant={id.strong ? 'default' : 'outline'}
                        className="h-4 px-1 text-[10px]"
                      >
                        {id.strong ? 'Strong' : 'Weak'}
                      </Badge>
                    </div>
                    <p
                      className={
                        active
                          ? 'mt-0.5 break-all font-mono text-xs'
                          : 'mt-0.5 break-all font-mono text-xs text-muted-foreground'
                      }
                    >
                      {id.value}
                    </p>
                    {!active && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Not used for matching (last seen more than {WEAK_IDENTIFIER_WINDOW_DAYS}{' '}
                        days ago)
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground sm:text-end">
                    {id.source && <div>{id.source}</div>}
                    <div>
                      First <RelativeTime date={id.first_seen} />
                    </div>
                    <div>
                      Last <RelativeTime date={id.last_seen} />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </DetailSection>

      <DetailSection title="Rename history" icon={History} count={renames.length || undefined}>
        {renLoading ? (
          <SectionSkeleton />
        ) : renError ? (
          <p className="text-sm text-muted-foreground">Rename history could not be loaded.</p>
        ) : renames.length === 0 ? (
          compactEmpty(History, 'Never renamed', 'Name changes the platform followed appear here.')
        ) : (
          <ol className="space-y-2">
            {renames.map((r) => (
              <li key={r.id} className="flex items-start gap-2 text-xs">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="break-all">
                    <span className="font-mono">{r.old_value || '—'}</span>
                    {' → '}
                    <span className="font-mono">{r.new_value || '—'}</span>
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    {SOURCE_LABEL[r.source] ?? r.source} · <RelativeTime date={r.changed_at} />
                    {r.reason ? ` · ${r.reason}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </DetailSection>
    </>
  )
}
