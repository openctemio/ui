'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { EmptyState } from '@/features/shared'
import { cn } from '@/lib/utils'
import { Download, Grid3x3 } from 'lucide-react'
import { toast } from 'sonner'
import { useThreatModelCoverage } from '../hooks/use-threat-model-coverage'
import {
  getThreatStatusStyle,
  THREAT_STATUS_ORDER,
  THREAT_STATUS_STYLES,
} from '../lib/threat-status'
import { buildNavigatorLayer, navigatorFileName } from '../lib/navigator-layer'
import type { CoverageTechnique, ThreatModelCoverage } from '../types'

interface CoverageHeatmapProps {
  modelId: string
  modelName: string
}

/**
 * ATT&CK-Navigator-style coverage matrix: one column per kill-chain tactic
 * (backend order), each a stack of technique cells colored by worst-case
 * status. Horizontal-scrolls so the page never scrolls sideways. Includes a
 * client-side Navigator layer (v4.5) export.
 */
export function CoverageHeatmap({ modelId, modelName }: CoverageHeatmapProps) {
  const { coverage, isLoading } = useThreatModelCoverage(modelId)

  if (isLoading || !coverage) {
    return <Skeleton className="h-96 w-full" data-testid="coverage-loading" />
  }

  const hasTechniques = coverage.totals.techniques > 0

  return (
    <div className="space-y-4">
      <CoverageToolbar coverage={coverage} modelName={modelName} disabled={!hasTechniques} />
      {hasTechniques ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ATT&CK Coverage Matrix</CardTitle>
            <CardDescription>
              Columns are kill-chain tactics; each cell is a technique colored by its worst-case
              threat status. {coverage.totals.techniques} techniques ·{' '}
              {Math.round(coverage.totals.coverage_pct)}% coverage.
            </CardDescription>
            <StatusLegend />
          </CardHeader>
          <CardContent className="overflow-x-auto pb-6" data-testid="coverage-matrix">
            <div className="flex min-w-max gap-2">
              {coverage.tactics.map((tactic) => (
                <TacticColumn
                  key={tactic.tactic}
                  tactic={tactic.tactic}
                  techniques={tactic.techniques}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={Grid3x3}
          title="No techniques in scope"
          description="This threat model has no derived ATT&CK techniques yet. Refresh it once attack paths and attacker profiles are available."
        />
      )}
    </div>
  )
}

function CoverageToolbar({
  coverage,
  modelName,
  disabled,
}: {
  coverage: ThreatModelCoverage
  modelName: string
  disabled: boolean
}) {
  const handleDownload = () => {
    const { layer, unmappedTactics } = buildNavigatorLayer(coverage, modelName)
    const blob = new Blob([JSON.stringify(layer, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = navigatorFileName(modelName)
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    if (unmappedTactics.length > 0) {
      toast.warning(`Layer exported; unmapped tactic shortnames: ${unmappedTactics.join(', ')}`)
    } else {
      toast.success('ATT&CK Navigator layer downloaded')
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-muted-foreground text-sm">
        Open{' '}
        <span className="text-red-600 dark:text-red-400 font-medium">{coverage.totals.open}</span> ·
        Theoretical{' '}
        <span className="text-slate-600 dark:text-slate-400 font-medium">
          {coverage.totals.theoretical}
        </span>{' '}
        · Covered/Mitigated{' '}
        <span className="text-green-600 dark:text-green-400 font-medium">
          {coverage.totals.covered + coverage.totals.mitigated}
        </span>
      </p>
      <Button variant="outline" size="sm" onClick={handleDownload} disabled={disabled}>
        <Download className="me-2 h-4 w-4" />
        Download Navigator layer
      </Button>
    </div>
  )
}

function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-3 pt-2">
      {THREAT_STATUS_ORDER.map((status) => {
        const style = THREAT_STATUS_STYLES[status]
        return (
          <div key={status} className="flex items-center gap-1.5">
            <span className={cn('h-3 w-3 rounded-sm', style.dotClass)} />
            <span className="text-muted-foreground text-xs">{style.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function TacticColumn({ tactic, techniques }: { tactic: string; techniques: CoverageTechnique[] }) {
  return (
    <div className="flex w-40 shrink-0 flex-col gap-1" data-testid="tactic-column">
      <div className="bg-muted/60 sticky top-0 rounded px-2 py-1.5 text-center">
        <p className="truncate text-xs font-semibold" title={tactic}>
          {tactic}
        </p>
        <p className="text-muted-foreground text-[10px]">{techniques.length}</p>
      </div>
      {techniques.map((tech) => (
        <TechniqueCell key={tech.technique_id} tech={tech} />
      ))}
    </div>
  )
}

function TechniqueCell({ tech }: { tech: CoverageTechnique }) {
  const style = getThreatStatusStyle(tech.status)
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            data-testid={`technique-cell-${tech.technique_id}`}
            data-status={tech.status}
            className={cn(
              'cursor-default rounded-sm border px-2 py-1.5 text-start transition-colors',
              style.badgeClass
            )}
          >
            <p className="font-mono text-[10px] font-semibold leading-tight">{tech.technique_id}</p>
            <p className="truncate text-[11px] leading-tight" title={tech.technique_name}>
              {tech.technique_name}
            </p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1 text-sm">
            <p className="font-semibold">{tech.technique_name}</p>
            <p className="text-muted-foreground font-mono text-xs">
              {tech.technique_id} · <span className="capitalize">{tech.status}</span> · max{' '}
              {tech.max_score}
            </p>
            <div className="text-muted-foreground text-xs">
              {tech.threat_count} threat{tech.threat_count === 1 ? '' : 's'} — open{' '}
              {tech.counts.open}, mitigated {tech.counts.mitigated}, covered {tech.counts.covered},
              accepted {tech.counts.accepted}, theoretical {tech.counts.theoretical}
            </div>
            {tech.mitigation_ids.length > 0 && (
              <p className="text-muted-foreground text-xs">
                Mitigations: {tech.mitigation_ids.join(', ')}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
