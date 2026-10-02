'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { AlertTriangle, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useScopeExclusionsApi } from '@/features/scope'
import type { CharterExclusion } from '../types'

/**
 * The charter's exclusions, picked from the scope exclusions scans enforce
 * (Scoping › Boundaries) instead of typed as free text. Each picked exclusion
 * is stored as `{item: pattern, reason}`, so the charter keeps its own
 * wording of why, and the reason defaults to the exclusion's.
 *
 * Entries that match no enforced exclusion (charters written before this
 * picker) are listed apart: they look like configuration but no scan honours
 * them.
 */
export function CharterExclusionsField({
  value,
  onChange,
  editable,
}: {
  value: CharterExclusion[]
  onChange: (next: CharterExclusion[]) => void
  editable: boolean
}) {
  const { data, error, isLoading } = useScopeExclusionsApi({ per_page: 100 })
  const exclusions = useMemo(() => data?.data ?? [], [data])
  const enforced = useMemo(
    () => new Set(exclusions.map((e) => e.pattern ?? '').filter(Boolean)),
    [exclusions]
  )
  const byItem = useMemo(() => new Map(value.map((e) => [e.item, e])), [value])
  const loaded = !!data
  const unenforced = loaded ? value.filter((e) => e.item.trim() && !enforced.has(e.item)) : []

  if (!editable) {
    const filled = value.filter((e) => e.item || e.reason)
    if (filled.length === 0) return <p className="text-sm text-muted-foreground">Not set</p>
    return (
      <ul className="space-y-1 text-sm">
        {filled.map((e, i) => (
          <li key={i} className="flex items-start gap-1.5">
            {loaded && enforced.has(e.item) ? (
              <ShieldCheck
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success"
                aria-label="Enforced on scans"
              />
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <span>
              <span className="font-mono">{e.item || 'Untitled'}</span>
              {e.reason && <span className="text-muted-foreground"> — {e.reason}</span>}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  const toggle = (pattern: string, reason: string, checked: boolean) =>
    onChange(
      checked ? [...value, { item: pattern, reason }] : value.filter((e) => e.item !== pattern)
    )
  const setReason = (item: string, reason: string) =>
    onChange(value.map((e) => (e.item === item ? { ...e, reason } : e)))

  return (
    <div className="space-y-3">
      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : error ? (
        <p className="text-sm text-muted-foreground">
          Scope exclusions could not be loaded (the Boundaries module may be off), so none can be
          picked here.
        </p>
      ) : exclusions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No exclusions yet.{' '}
          <Link href="/scope-config?tab=exclusions" className="underline">
            Add them under Boundaries
          </Link>{' '}
          so scans honour them, then pick them here.
        </p>
      ) : (
        <div className="space-y-1 rounded-md border p-2">
          {exclusions.map((ex) => {
            const pattern = ex.pattern ?? ''
            const picked = byItem.get(pattern)
            const id = `charter-exclusion-${ex.id}`
            return (
              <div key={ex.id} className="space-y-1.5 rounded px-1 py-1.5 hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={!!picked}
                    onCheckedChange={(c) => toggle(pattern, ex.reason ?? '', c === true)}
                  />
                  <Label htmlFor={id} className="flex-1 cursor-pointer font-normal">
                    <span className="font-mono text-sm">{pattern}</span>
                    {ex.exclusion_type && (
                      <span className="ms-2 text-xs text-muted-foreground">
                        {ex.exclusion_type.replace(/_/g, ' ')}
                      </span>
                    )}
                  </Label>
                </div>
                {picked && (
                  <Input
                    aria-label={`Reason for excluding ${pattern}`}
                    className="ms-6 h-8 w-[calc(100%-1.5rem)]"
                    placeholder="Why it is out of scope"
                    value={picked.reason}
                    onChange={(e) => setReason(pattern, e.target.value)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {unenforced.length > 0 && (
        <div className="space-y-1 rounded-md border bg-muted/40 p-2 text-sm">
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Not enforced: no scope exclusion matches these, so scans still touch them.
          </p>
          <ul className="space-y-1">
            {unenforced.map((e) => (
              <li key={e.item} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {e.item}
                  {e.reason && <span className="text-muted-foreground"> — {e.reason}</span>}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label={`Remove ${e.item}`}
                  onClick={() => onChange(value.filter((x) => x.item !== e.item))}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
