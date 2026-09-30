'use client'

import { useCallback, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  MetricStrip,
  type MetricStripItem,
  DataTable,
  DataTableColumnHeader,
  StackedCell,
  EmptyState,
} from '@/features/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Swords, Play, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  useSimulations,
  useRunSimulation,
  type Simulation,
} from '@/features/simulation/api/use-simulation-api'

// Theme tokens only: a bypass is the one outcome worth colouring.
function ResultBadge({ result }: { result: string }) {
  if (!result) return <span className="text-xs text-muted-foreground">—</span>
  const bypassed = result === 'bypassed'
  return (
    <Badge
      variant={bypassed ? 'outline' : 'secondary'}
      className={bypassed ? 'capitalize text-destructive' : 'capitalize'}
    >
      {result}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === 'active' ? 'default' : 'secondary'} className="capitalize">
      {status || 'draft'}
    </Badge>
  )
}

function LoadingSkeleton() {
  return (
    <Main>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      <Skeleton className="mt-5 h-16 rounded-xl" />
      <Skeleton className="mt-5 h-96 rounded-xl" />
    </Main>
  )
}

export default function AttackSimulationPage() {
  const { data, isLoading, mutate } = useSimulations()
  const { trigger: runSimulation } = useRunSimulation()

  const handleRun = useCallback(
    async (simId: string) => {
      try {
        const result = await runSimulation(simId)
        toast.success(`Simulation completed: ${result?.result ?? 'done'}`)
        mutate()
      } catch {
        toast.error('Failed to run simulation')
      }
    },
    [runSimulation, mutate]
  )

  const stats = useMemo(() => {
    const sims = data?.data ?? []
    const total = sims.length
    const completed = sims.filter(
      (s) => s.last_result === 'detected' || s.last_result === 'prevented'
    ).length
    const failed = sims.filter((s) => s.last_result === 'bypassed').length
    const active = sims.filter((s) => s.status === 'active').length
    const avgDetection = total > 0 ? sims.reduce((sum, s) => sum + s.detection_rate, 0) / total : 0

    return { total, completed, failed, active, avgDetection }
  }, [data])

  const columns = useMemo<ColumnDef<Simulation>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Technique" />,
        cell: ({ row }) => {
          const sim = row.original
          return (
            <StackedCell
              primary={sim.name}
              secondary={
                <>
                  {sim.mitre_technique_id && `${sim.mitre_technique_id} — `}
                  {sim.mitre_technique_name || sim.simulation_type}
                </>
              }
            />
          )
        },
      },
      {
        accessorKey: 'mitre_tactic',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Tactic" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {row.original.mitre_tactic || row.original.simulation_type}
          </Badge>
        ),
      },
      {
        accessorKey: 'last_run_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Last run" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.last_run_at
              ? new Date(row.original.last_run_at).toLocaleDateString()
              : 'Never'}
          </span>
        ),
      },
      {
        accessorKey: 'detection_rate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Detection rate" />,
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-2">
            <Progress value={row.original.detection_rate} className="h-2 w-16" />
            <span className="text-sm tabular-nums">{Math.round(row.original.detection_rate)}%</span>
          </div>
        ),
      },
      {
        accessorKey: 'last_result',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Result" />,
        cell: ({ row }) => <ResultBadge result={row.original.last_result} />,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1"
            disabled={row.original.status !== 'active'}
            onClick={(e) => {
              e.stopPropagation()
              handleRun(row.original.id)
            }}
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
        ),
      },
    ],
    [handleRun]
  )

  if (isLoading) return <LoadingSkeleton />

  const simulations = data?.data ?? []

  const metrics: MetricStripItem[] = [
    { key: 'total', label: 'Simulations', value: stats.total },
    { key: 'active', label: 'Active', value: stats.active },
    { key: 'caught', label: 'Detected or prevented', value: stats.completed },
    { key: 'bypassed', label: 'Bypassed', value: stats.failed, tone: 'danger' },
    { key: 'rate', label: 'Avg detection rate', value: `${Math.round(stats.avgDetection)}%` },
  ]

  return (
    <Main>
      <PageHeader
        title="Attack simulation"
        description="Run MITRE ATT&CK-mapped attack techniques to check that your controls catch them."
      >
        <Button size="sm" disabled title="Simulation creation is coming soon">
          <Plus className="h-4 w-4 sm:me-2" />
          <span className="hidden sm:inline">New simulation</span>
        </Button>
      </PageHeader>

      <MetricStrip className="mt-5" items={metrics} />

      <div className="mt-5">
        {simulations.length === 0 ? (
          <EmptyState
            icon={Swords}
            title="No simulations yet"
            description="Simulations appear here once they are created for this tenant."
          />
        ) : (
          <DataTable
            columns={columns}
            data={simulations}
            searchPlaceholder="Search simulations…"
            emptyMessage="No simulations match"
            emptyDescription="Try a different search."
          />
        )}
      </div>
    </Main>
  )
}
