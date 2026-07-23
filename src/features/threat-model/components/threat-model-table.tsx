'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/features/shared'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ExternalLink, FileWarning, Info } from 'lucide-react'
import { getMitreTechnique, mitreTechniqueUrl } from '@/features/pentest/lib/mitre-attack'
import type { AttackerProfileLite, Threat, ThreatFilters } from '../types'
import { getThreatStatusStyle } from '../lib/threat-status'

interface ThreatModelTableProps {
  threats: Threat[]
  filters: ThreatFilters
  onFiltersChange: (filters: ThreatFilters) => void
  profileMap: Map<string, AttackerProfileLite>
  nameFor: (id: string | undefined) => string
}

const ALL = 'all'

/** Build a readable entry → hop → target path from resolved asset names. */
function pathLabel(threat: Threat, nameFor: (id: string | undefined) => string): string {
  const raw = [threat.entry_point_asset_id, threat.hop_asset_id, threat.target_asset_id]
    .filter(Boolean)
    .map((id) => nameFor(id))
  const dedup = raw.filter((name, i) => i === 0 || name !== raw[i - 1])
  return dedup.join(' → ')
}

export function ThreatModelTable({
  threats,
  filters,
  onFiltersChange,
  profileMap,
  nameFor,
}: ThreatModelTableProps) {
  // Filter option lists derived from the full (unfiltered) threat set.
  const { tactics, attackers, techniques, statuses } = useMemo(() => {
    const tacticSet = new Set<string>()
    const attackerSet = new Map<string, string>()
    const techniqueSet = new Map<string, string>()
    const statusSet = new Set<string>()
    for (const t of threats) {
      tacticSet.add(t.tactic)
      statusSet.add(t.status)
      attackerSet.set(
        t.attacker_profile_id,
        profileMap.get(t.attacker_profile_id)?.name ?? 'Unknown'
      )
      const techName = t.technique_name ?? getMitreTechnique(t.technique_id)?.name
      techniqueSet.set(
        t.technique_id,
        techName ? `${t.technique_id} · ${techName}` : t.technique_id
      )
    }
    return {
      tactics: Array.from(tacticSet).sort(),
      attackers: Array.from(attackerSet.entries()).sort((a, b) => a[1].localeCompare(b[1])),
      techniques: Array.from(techniqueSet.entries()).sort((a, b) => a[0].localeCompare(b[0])),
      statuses: Array.from(statusSet).sort(),
    }
  }, [threats, profileMap])

  const filtered = useMemo(
    () =>
      threats.filter((t) => {
        if (filters.status !== ALL && t.status !== filters.status) return false
        if (filters.tactic !== ALL && t.tactic !== filters.tactic) return false
        if (filters.attacker !== ALL && t.attacker_profile_id !== filters.attacker) return false
        if (filters.technique !== ALL && t.technique_id !== filters.technique) return false
        return true
      }),
    [threats, filters]
  )

  const columns = useMemo<ColumnDef<Threat>[]>(
    () => [
      {
        accessorKey: 'attacker_profile_id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Attacker" />,
        cell: ({ row }) => {
          const profile = profileMap.get(row.original.attacker_profile_id)
          return <span className="font-medium">{profile?.name ?? 'Unknown attacker'}</span>
        },
      },
      {
        id: 'path',
        header: 'Attack path',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs">
            {pathLabel(row.original, nameFor)}
          </span>
        ),
      },
      {
        accessorKey: 'technique_id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Technique" />,
        cell: ({ row }) => {
          const id = row.original.technique_id
          const name = row.original.technique_name ?? getMitreTechnique(id)?.name
          return (
            <a
              href={mitreTechniqueUrl(id)}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1"
            >
              <span className="font-mono text-xs font-medium">{id}</span>
              {name && <span className="text-muted-foreground text-xs">{name}</span>}
              <ExternalLink className="text-muted-foreground h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          )
        },
      },
      {
        accessorKey: 'tactic',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Tactic" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="font-normal">
            {row.original.tactic}
          </Badge>
        ),
      },
      {
        accessorKey: 'mitigation_id',
        header: 'Mitigation',
        enableSorting: false,
        cell: ({ row }) => {
          const id = row.original.mitigation_id
          const name = row.original.mitigation_name
          const summary = row.original.mitigation_summary
          if (!id && !name) {
            return <span className="text-muted-foreground text-xs">—</span>
          }
          // Prefer the human name; keep the Mxxxx id as a muted secondary label.
          const primary = name ?? id
          const label = (
            <span className="flex flex-col leading-tight">
              <span className="text-sm">{primary}</span>
              {name && id && <span className="text-muted-foreground font-mono text-xs">{id}</span>}
            </span>
          )
          if (!summary) return label
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help items-start gap-1">
                    {label}
                    <Info className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{summary}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const t = row.original
          const style = getThreatStatusStyle(t.status)
          return (
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={cn('font-medium', style.badgeClass)}>
                {style.label}
              </Badge>
              {t.status_reason && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="text-muted-foreground h-3.5 w-3.5 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">{t.status_reason}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'score',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Score" />,
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">{row.original.score.toFixed(1)}</span>
        ),
      },
      {
        id: 'evidence',
        header: 'Evidence',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.evidence_finding_id ? (
            <Button variant="ghost" size="sm" asChild className="h-7 px-2">
              <Link href={`/findings/${row.original.evidence_finding_id}`}>
                <FileWarning className="me-1 h-3.5 w-3.5" />
                Finding
              </Link>
            </Button>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
      },
    ],
    [profileMap, nameFor]
  )

  const setFilter = (patch: Partial<ThreatFilters>) => onFiltersChange({ ...filters, ...patch })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.status}
          onValueChange={(v) => setFilter({ status: v as ThreatFilters['status'] })}
        >
          <SelectTrigger className="w-[150px]" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {getThreatStatusStyle(s as Threat['status']).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.tactic} onValueChange={(v) => setFilter({ tactic: v })}>
          <SelectTrigger className="w-[180px]" aria-label="Filter by tactic">
            <SelectValue placeholder="Tactic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All tactics</SelectItem>
            {tactics.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.attacker} onValueChange={(v) => setFilter({ attacker: v })}>
          <SelectTrigger className="w-[210px]" aria-label="Filter by attacker">
            <SelectValue placeholder="Attacker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All attackers</SelectItem>
            {attackers.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.technique} onValueChange={(v) => setFilter({ technique: v })}>
          <SelectTrigger className="w-[240px]" aria-label="Filter by technique">
            <SelectValue placeholder="Technique" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All techniques</SelectItem>
            {techniques.map(([id, label]) => (
              <SelectItem key={id} value={id}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filters.status !== ALL ||
          filters.tactic !== ALL ||
          filters.attacker !== ALL ||
          filters.technique !== ALL) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onFiltersChange({ status: ALL, tactic: ALL, attacker: ALL, technique: ALL })
            }
          >
            Clear filters
          </Button>
        )}

        <span className="text-muted-foreground ms-auto text-sm">
          {filtered.length} of {threats.length} threats
        </span>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        showSearch={false}
        emptyMessage="No threats match the current filters."
      />
    </div>
  )
}
