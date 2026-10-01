'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { ArrowUpRight, CheckCircle2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchAllPages } from '@/lib/api/fetch-all-pages'
import { API_BASE } from '@/lib/api/endpoints'
import type { ScanZone, ScanZoneCoverage } from '@/lib/api/scan-zone-types'
import { Permission, useHasPermission } from '@/lib/permissions'

import { isPrivatePrefix, parsePrefix, prefixContainsAddr } from '../lib/ranges'

interface InventoryAsset {
  id: string
  name: string
  type: string
}

/** Asset types whose name can be one IP address, as the coverage endpoint counts them. */
const ADDRESS_TYPES = 'ip_address,host'
const PER_PAGE = 100
/** Bound the browser-side listing; the counts above always come from the API. */
const MAX_PAGES = 10
const MAX_LISTED = 50

export interface OutsideAddress {
  id: string
  address: string
  type: string
  private: boolean
}

/**
 * Inventory addresses no zone range holds (the default zone's "public"
 * catch-all does not count: these are addresses no range names).
 */
export function addressesOutsideZones(
  assets: InventoryAsset[],
  zones: Pick<ScanZone, 'ranges'>[]
): OutsideAddress[] {
  const prefixes = zones.flatMap((z) => z.ranges).flatMap((r) => parsePrefix(r) ?? [])
  const out: OutsideAddress[] = []
  for (const a of assets) {
    const p = parsePrefix(a.name)
    if (!p || p.bits !== (p.addr.v4 ? 32 : 128)) continue // not a single IP address
    if (prefixes.some((z) => prefixContainsAddr(z, p.addr))) continue
    out.push({ id: a.id, address: a.name, type: a.type, private: isPrivatePrefix(p) })
  }
  // Private first: scans skip those (they need a zone); public go to the default zone.
  return out.sort((x, y) => Number(y.private) - Number(x.private))
}

function useInventoryAddresses(enabled: boolean) {
  return useSWR(
    enabled ? ['scan-zone-coverage-inventory', ADDRESS_TYPES] : null,
    async () => {
      let truncated = false
      const rows = await fetchAllPages<InventoryAsset>(
        (page, perPage) =>
          `${API_BASE.ASSETS}?types=${ADDRESS_TYPES}&page=${page}&per_page=${perPage}`,
        {
          perPage: PER_PAGE,
          maxPages: MAX_PAGES,
          onTruncated: () => {
            truncated = true
          },
        }
      )
      return { rows, truncated }
    },
    { revalidateOnFocus: false }
  )
}

interface ZoneCoverageCardProps {
  coverage: ScanZoneCoverage
  zones: ScanZone[]
}

/**
 * RFC-023 V3: which inventory addresses fall in no zone, and which zones with
 * private ranges have no healthy sensor. Counts are the API's; the address
 * list is computed in the browser from the inventory (first 1,000 addresses).
 */
export function ZoneCoverageCard({ coverage, zones }: ZoneCoverageCardProps) {
  const outside = coverage.outside_private + coverage.outside_public
  // Listing the addresses reads the asset inventory; without assets:read only
  // the API's counts are shown.
  const canReadAssets = useHasPermission(Permission.AssetsRead)
  const { data, isLoading, error } = useInventoryAddresses(outside > 0 && canReadAssets)
  const listed = useMemo(() => (data ? addressesOutsideZones(data.rows, zones) : []), [data, zones])

  const unhealthyPrivate = coverage.zones.filter(
    (z) => (z.has_private_range || z.is_default) && z.healthy_sensors === 0
  )

  return (
    <Card data-testid="zone-coverage">
      <CardHeader>
        <CardTitle>Coverage</CardTitle>
        <CardDescription>
          {coverage.inventory_addresses.toLocaleString()} inventory addresses:{' '}
          {coverage.in_zones.toLocaleString()} inside a zone,{' '}
          {coverage.outside_private.toLocaleString()} private outside every zone (scans skip these),{' '}
          {coverage.outside_public.toLocaleString()} public outside every range
          {coverage.has_default_zone ? ' (scanned through the default zone)' : ''}.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="zone-outside-heading" className="min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 id="zone-outside-heading" className="text-sm font-semibold">
              Addresses outside every zone
            </h3>
            {canReadAssets && (
              <Button asChild variant="link" size="sm" className="h-auto p-0">
                <Link href="/assets/ip-addresses">
                  Asset inventory
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
          {outside === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Every inventory address is inside a zone.
            </p>
          ) : !canReadAssets ? (
            <p className="text-sm text-muted-foreground">
              {outside.toLocaleString()} addresses are outside every zone. Listing them needs access
              to the asset inventory.
            </p>
          ) : isLoading ? (
            <div className="space-y-1.5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-7 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground">
              Could not list the addresses ({outside.toLocaleString()} counted). Open the asset
              inventory to review them.
            </p>
          ) : (
            <>
              <ul className="divide-y rounded-md border" data-testid="zone-outside-list">
                {listed.slice(0, MAX_LISTED).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                    <Link
                      href={`/assets/${a.id}`}
                      className="min-w-0 truncate font-mono text-sm hover:underline"
                    >
                      {a.address}
                    </Link>
                    {a.private ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 text-xs font-normal text-warning"
                      >
                        Private, not scanned
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-xs font-normal">
                        Public
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                {listed.length > MAX_LISTED ? `Showing ${MAX_LISTED} of ${listed.length}. ` : ''}
                {data?.truncated
                  ? `Listed from the first ${(PER_PAGE * MAX_PAGES).toLocaleString()} inventory addresses.`
                  : 'Add their ranges to a zone to scan the private ones.'}
              </p>
            </>
          )}
        </section>

        <section aria-labelledby="zone-unhealthy-heading" className="min-w-0 space-y-2">
          <h3 id="zone-unhealthy-heading" className="text-sm font-semibold">
            Zones with no online sensor
          </h3>
          {unhealthyPrivate.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Every private and default zone has an online sensor.
            </p>
          ) : (
            <ul className="divide-y rounded-md border" data-testid="zone-unhealthy-list">
              {unhealthyPrivate.map((z) => (
                <li key={z.zone_id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                  <span className="min-w-0 truncate text-sm font-medium">{z.name}</span>
                  <span className="shrink-0 text-xs text-destructive">
                    {z.assigned_sensors === 0
                      ? 'No sensors assigned'
                      : `0 of ${z.assigned_sensors} online`}
                    {z.addresses > 0 ? ` · ${z.addresses.toLocaleString()} addresses wait` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
