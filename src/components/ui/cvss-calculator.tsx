'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calculator, RotateCcw } from 'lucide-react'

// ============================================
// CVSS 4.0 Base Metric Definitions
// Ref: https://www.first.org/cvss/v4.0/specification-document
// ============================================

type MetricValues = Record<string, string>

interface MetricOption {
  value: string
  label: string
  description: string
}

interface MetricDef {
  key: string
  name: string
  abbr: string
  options: MetricOption[]
}

// Exploitability metrics
const EXPLOITABILITY: MetricDef[] = [
  {
    key: 'AV',
    name: 'Attack Vector',
    abbr: 'AV',
    options: [
      { value: 'N', label: 'Network', description: 'Remotely exploitable' },
      { value: 'A', label: 'Adjacent', description: 'Adjacent network' },
      { value: 'L', label: 'Local', description: 'Local access' },
      { value: 'P', label: 'Physical', description: 'Physical access' },
    ],
  },
  {
    key: 'AC',
    name: 'Attack Complexity',
    abbr: 'AC',
    options: [
      { value: 'L', label: 'Low', description: 'No special conditions' },
      { value: 'H', label: 'High', description: 'Specific conditions needed' },
    ],
  },
  {
    key: 'AT',
    name: 'Attack Requirements',
    abbr: 'AT',
    options: [
      { value: 'N', label: 'None', description: 'No prerequisites' },
      { value: 'P', label: 'Present', description: 'Prerequisites exist' },
    ],
  },
  {
    key: 'PR',
    name: 'Privileges Required',
    abbr: 'PR',
    options: [
      { value: 'N', label: 'None', description: 'No auth needed' },
      { value: 'L', label: 'Low', description: 'Basic privileges' },
      { value: 'H', label: 'High', description: 'Admin privileges' },
    ],
  },
  {
    key: 'UI',
    name: 'User Interaction',
    abbr: 'UI',
    options: [
      { value: 'N', label: 'None', description: 'No user action' },
      { value: 'P', label: 'Passive', description: 'Involuntary action' },
      { value: 'A', label: 'Active', description: 'Deliberate action' },
    ],
  },
]

// Impact metrics — Vulnerable System
const IMPACT_VULNERABLE: MetricDef[] = [
  {
    key: 'VC',
    name: 'Confidentiality',
    abbr: 'VC',
    options: [
      { value: 'N', label: 'None', description: 'No impact' },
      { value: 'L', label: 'Low', description: 'Limited disclosure' },
      { value: 'H', label: 'High', description: 'Total disclosure' },
    ],
  },
  {
    key: 'VI',
    name: 'Integrity',
    abbr: 'VI',
    options: [
      { value: 'N', label: 'None', description: 'No impact' },
      { value: 'L', label: 'Low', description: 'Limited modification' },
      { value: 'H', label: 'High', description: 'Total modification' },
    ],
  },
  {
    key: 'VA',
    name: 'Availability',
    abbr: 'VA',
    options: [
      { value: 'N', label: 'None', description: 'No impact' },
      { value: 'L', label: 'Low', description: 'Reduced availability' },
      { value: 'H', label: 'High', description: 'Total loss' },
    ],
  },
]

// Impact metrics — Subsequent System
const IMPACT_SUBSEQUENT: MetricDef[] = [
  {
    key: 'SC',
    name: 'Confidentiality',
    abbr: 'SC',
    options: [
      { value: 'N', label: 'None', description: 'No impact' },
      { value: 'L', label: 'Low', description: 'Limited disclosure' },
      { value: 'H', label: 'High', description: 'Total disclosure' },
    ],
  },
  {
    key: 'SI',
    name: 'Integrity',
    abbr: 'SI',
    options: [
      { value: 'N', label: 'None', description: 'No impact' },
      { value: 'L', label: 'Low', description: 'Limited modification' },
      { value: 'H', label: 'High', description: 'Total modification' },
    ],
  },
  {
    key: 'SA',
    name: 'Availability',
    abbr: 'SA',
    options: [
      { value: 'N', label: 'None', description: 'No impact' },
      { value: 'L', label: 'Low', description: 'Reduced availability' },
      { value: 'H', label: 'High', description: 'Total loss' },
    ],
  },
]

const ALL_METRICS = [...EXPLOITABILITY, ...IMPACT_VULNERABLE, ...IMPACT_SUBSEQUENT]

// ============================================
// CVSS 4.0 Score Calculation (MacroVector approach)
// Simplified but accurate approximation per FIRST spec
// ============================================

function calculateCvss4Score(m: MetricValues): number | null {
  for (const def of ALL_METRICS) {
    if (!m[def.key]) return null
  }

  // Exploitability
  const avW: Record<string, number> = { N: 0.0, A: 0.1, L: 0.25, P: 0.4 }
  const acW: Record<string, number> = { L: 0.0, H: 0.2 }
  const atW: Record<string, number> = { N: 0.0, P: 0.1 }
  const prW: Record<string, number> = { N: 0.0, L: 0.1, H: 0.3 }
  const uiW: Record<string, number> = { N: 0.0, P: 0.1, A: 0.2 }

  const exploitDifficulty = avW[m.AV] + acW[m.AC] + atW[m.AT] + prW[m.PR] + uiW[m.UI]

  const exploitability = Math.max(0, 1 - exploitDifficulty)

  // Impact on Vulnerable System
  const ciW: Record<string, number> = { N: 0, L: 0.22, H: 0.56 }
  const vulnImpact = 1 - (1 - ciW[m.VC]) * (1 - ciW[m.VI]) * (1 - ciW[m.VA])

  // Impact on Subsequent System
  const subImpact = 1 - (1 - ciW[m.SC]) * (1 - ciW[m.SI]) * (1 - ciW[m.SA])

  // Combined impact (subsequent has lower weight)
  const totalImpact = Math.min(vulnImpact + 0.5 * subImpact, 1)

  if (totalImpact <= 0) return 0

  // Base Score
  const rawScore = 10 * exploitability * totalImpact
  const score = Math.min(Math.ceil(rawScore * 10) / 10, 10)

  return score
}

function buildVector(metrics: MetricValues): string {
  const parts = ALL_METRICS.filter((g) => metrics[g.key]).map((g) => `${g.key}:${metrics[g.key]}`)
  if (parts.length === 0) return ''
  return `CVSS:4.0/${parts.join('/')}`
}

function parseVector(vector: string): MetricValues {
  const result: MetricValues = {}
  if (!vector) return result
  const prefix = vector.startsWith('CVSS:4.0/') ? 'CVSS:4.0/' : 'CVSS:3.1/'
  if (!vector.startsWith(prefix)) return result

  const parts = vector.replace(prefix, '').split('/')
  for (const part of parts) {
    const [key, value] = part.split(':')
    if (key && value) result[key] = value
  }
  return result
}

function getSeverityLabel(score: number): string {
  if (score === 0) return 'None'
  if (score <= 3.9) return 'Low'
  if (score <= 6.9) return 'Medium'
  if (score <= 8.9) return 'High'
  return 'Critical'
}

function getSeverityColor(score: number): string {
  if (score === 0) return 'bg-gray-400 text-white'
  if (score <= 3.9) return 'bg-blue-500 text-white'
  if (score <= 6.9) return 'bg-yellow-500 text-white'
  if (score <= 8.9) return 'bg-orange-500 text-white'
  return 'bg-red-500 text-white'
}

function getSeverityRingColor(score: number): string {
  if (score === 0) return 'ring-gray-400'
  if (score <= 3.9) return 'ring-blue-500'
  if (score <= 6.9) return 'ring-yellow-500'
  if (score <= 8.9) return 'ring-orange-500'
  return 'ring-red-500'
}

// ============================================
// Sub-components
// ============================================

function MetricRow({
  metric,
  selected,
  onSelect,
}: {
  metric: MetricDef
  selected: string | undefined
  onSelect: (value: string) => void
}) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground block mb-1.5">{metric.name}</span>
      <div className="flex gap-1">
        {metric.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            title={opt.description}
            className={cn(
              'flex-1 px-1.5 py-1.5 rounded text-xs font-medium border transition-all',
              selected === opt.value
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-muted/50 hover:bg-muted border-transparent text-muted-foreground'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

interface CvssCalculatorProps {
  score: string
  vector: string
  onScoreChange: (score: string) => void
  onVectorChange: (vector: string) => void
}

export function CvssCalculator({
  score,
  vector,
  onScoreChange,
  onVectorChange,
}: CvssCalculatorProps) {
  const [expanded, setExpanded] = useState(false)
  const [metrics, setMetrics] = useState<MetricValues>(() => parseVector(vector))

  // Sync from external vector changes
  useEffect(() => {
    if (vector) setMetrics(parseVector(vector))
  }, [vector])

  function handleMetricChange(key: string, value: string) {
    const updated = { ...metrics, [key]: value }
    setMetrics(updated)

    const newVector = buildVector(updated)
    onVectorChange(newVector)

    const newScore = calculateCvss4Score(updated)
    if (newScore !== null) {
      onScoreChange(newScore.toString())
    }
  }

  function handleReset() {
    setMetrics({})
    onScoreChange('')
    onVectorChange('')
  }

  const calculatedScore = calculateCvss4Score(metrics)
  const allSelected = ALL_METRICS.every((g) => metrics[g.key])
  const selectedCount = ALL_METRICS.filter((g) => metrics[g.key]).length

  return (
    <div className="space-y-3">
      {/* Header: toggle + score */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
        >
          <Calculator className="h-4 w-4" />
          CVSS 4.0 Calculator
          {!expanded && selectedCount > 0 && !allSelected && (
            <span className="text-xs text-muted-foreground">
              ({selectedCount}/{ALL_METRICS.length})
            </span>
          )}
        </button>

        {allSelected && calculatedScore !== null && (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ring-2',
                getSeverityColor(calculatedScore),
                getSeverityRingColor(calculatedScore)
              )}
            >
              {calculatedScore.toFixed(1)}
            </div>
            <span className="text-sm font-medium">{getSeverityLabel(calculatedScore)}</span>
          </div>
        )}
      </div>

      {/* Vector string */}
      {allSelected && (
        <code className="block text-xs text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded select-all">
          {buildVector(metrics)}
        </code>
      )}

      {/* Calculator grid — 2 columns */}
      {expanded && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column: Exploitability */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Exploitability
              </h4>
              {EXPLOITABILITY.map((metric) => (
                <MetricRow
                  key={metric.key}
                  metric={metric}
                  selected={metrics[metric.key]}
                  onSelect={(v) => handleMetricChange(metric.key, v)}
                />
              ))}
            </div>

            {/* Right column: Impact */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Vulnerable System Impact
              </h4>
              {IMPACT_VULNERABLE.map((metric) => (
                <MetricRow
                  key={metric.key}
                  metric={metric}
                  selected={metrics[metric.key]}
                  onSelect={(v) => handleMetricChange(metric.key, v)}
                />
              ))}

              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">
                Subsequent System Impact
              </h4>
              {IMPACT_SUBSEQUENT.map((metric) => (
                <MetricRow
                  key={metric.key}
                  metric={metric}
                  selected={metrics[metric.key]}
                  onSelect={(v) => handleMetricChange(metric.key, v)}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset
            </Button>
            {!allSelected && (
              <span className="text-xs text-muted-foreground">
                {ALL_METRICS.length - selectedCount} metrics remaining
              </span>
            )}
            {allSelected && calculatedScore !== null && (
              <Badge className={cn('text-sm', getSeverityColor(calculatedScore))}>
                {calculatedScore.toFixed(1)} {getSeverityLabel(calculatedScore)}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
