'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  Save,
  RotateCcw,
  Info,
  SlidersHorizontal,
  Eye,
  RefreshCw,
  ArrowUpDown,
  Sparkles,
  Loader2,
} from 'lucide-react'
import {
  useRiskScoringSettings,
  useUpdateRiskScoring,
  useRiskScoringPreview,
  useRecalculateRiskScores,
  useRiskScoringPresets,
} from '@/features/organization/api/use-risk-scoring-settings'
import type {
  RiskScoringSettings,
  RiskScorePreviewItem,
} from '@/features/organization/types/settings.types'
import { Pagination } from '@/components/ui/pagination'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getErrorMessage } from '@/lib/api/error-handler'

function LoadingSkeleton() {
  return (
    <Main>
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </Main>
  )
}

// Visual stacked bar showing weight distribution
function WeightDistributionBar({
  weights,
}: {
  weights: { exposure: number; criticality: number; findings: number; ctem: number }
}) {
  const segments = [
    { key: 'exposure', label: 'Exposure', color: '#ef4444', value: weights.exposure },
    { key: 'criticality', label: 'Criticality', color: '#f97316', value: weights.criticality },
    { key: 'findings', label: 'Findings', color: '#eab308', value: weights.findings },
    { key: 'ctem', label: 'CTEM', color: '#3b82f6', value: weights.ctem },
  ]

  return (
    <div className="space-y-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {segments.map((seg) =>
          seg.value > 0 ? (
            <div
              key={seg.key}
              className="transition-all duration-200"
              style={{ width: `${seg.value}%`, backgroundColor: seg.color }}
              title={`${seg.label}: ${seg.value}%`}
            />
          ) : null
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1.5 text-xs">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-muted-foreground">
              {seg.label}: {seg.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WeightSlider({
  label,
  value,
  onChange,
  color,
  tooltip,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  color: string
  tooltip?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center text-sm font-medium">
          {label}
          {tooltip && <InfoTip text={tooltip} />}
        </Label>
        <span className="text-muted-foreground text-sm">{value}%</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={0}
          max={100}
          step={5}
          className="flex-1"
        />
      </div>
    </div>
  )
}

// Preset descriptions for user context
const PRESET_DESCRIPTIONS: Record<string, string> = {
  legacy: 'Original formula (backward compatible)',
  default: 'Balanced for general-purpose use',
  banking: 'High criticality + CTEM, PII-focused',
  healthcare: 'Highest CTEM weight, PHI + HIPAA',
  ecommerce: 'Highest exposure, public-facing apps',
  government: 'High compliance + restricted data',
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground ml-1 inline-flex cursor-help"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  tooltip,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  tooltip?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="flex items-center text-xs">
        {label}
        {tooltip && <InfoTip text={tooltip} />}
      </Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="h-8 text-sm"
      />
    </div>
  )
}

export default function ScoringConfigurationPage() {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.id
  const { settings, isLoading, mutate } = useRiskScoringSettings(tenantId)
  const { updateRiskScoring, isUpdating } = useUpdateRiskScoring(tenantId)
  const { previewChanges, isPreviewing } = useRiskScoringPreview(tenantId)
  const { recalculate, isRecalculating } = useRecalculateRiskScores(tenantId)
  const { presets } = useRiskScoringPresets(tenantId)

  const [config, setConfig] = useState<RiskScoringSettings | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [previewItems, setPreviewItems] = useState<RiskScorePreviewItem[] | null>(null)
  const [previewTotalAssets, setPreviewTotalAssets] = useState<number>(0)
  const [previewPage, setPreviewPage] = useState(1)
  const previewPageSize = 10

  // Initialize form from API data
  useEffect(() => {
    if (settings && !config) {
      setConfig(settings)
    }
  }, [settings, config])

  const updateConfig = useCallback(
    (updater: (prev: RiskScoringSettings) => RiskScoringSettings) => {
      setConfig((prev) => {
        if (!prev) return prev
        const updated = updater(prev)
        updated.preset = 'custom'
        return updated
      })
      setIsDirty(true)
      setPreviewItems(null)
      setPreviewTotalAssets(0)
    },
    []
  )

  // Smart weight update: auto-redistribute remaining weight to other components
  const updateWeight = useCallback(
    (key: keyof RiskScoringSettings['weights'], newValue: number) => {
      updateConfig((prev) => {
        const weights = { ...prev.weights }
        const oldValue = weights[key]
        const delta = newValue - oldValue
        if (delta === 0) return prev

        weights[key] = newValue

        // Distribute -delta proportionally among the other 3 keys
        const otherKeys = (['exposure', 'criticality', 'findings', 'ctem'] as const).filter(
          (k) => k !== key
        )
        const otherSum = otherKeys.reduce((s, k) => s + weights[k], 0)

        if (otherSum > 0) {
          let remaining = -delta
          for (let i = 0; i < otherKeys.length; i++) {
            const k = otherKeys[i]
            if (i === otherKeys.length - 1) {
              // Last key gets whatever is left to avoid rounding drift
              weights[k] = Math.max(0, Math.min(100, weights[k] + remaining))
            } else {
              const share = Math.round((weights[k] / otherSum) * -delta)
              const adjusted = Math.max(0, Math.min(100, weights[k] + share))
              remaining -= adjusted - weights[k]
              weights[k] = adjusted
            }
          }
        } else {
          // All others are 0 — split equally
          const each = Math.floor((100 - newValue) / otherKeys.length)
          otherKeys.forEach((k, i) => {
            weights[k] =
              i === otherKeys.length - 1 ? 100 - newValue - each * (otherKeys.length - 1) : each
          })
        }

        return { ...prev, weights }
      })
    },
    [updateConfig]
  )

  const handleSave = async () => {
    if (!config) return
    try {
      const result = await updateRiskScoring(config)
      await mutate()
      setIsDirty(false)
      if (result && result.assets_updated > 0) {
        toast.success(`Configuration saved and ${result.assets_updated} asset scores recalculated`)
      } else {
        toast.success('Scoring configuration saved')
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const handleReset = () => {
    if (settings) {
      setConfig(settings)
      setIsDirty(false)
      setPreviewItems(null)
      setPreviewTotalAssets(0)
    }
  }

  const handlePresetSelect = (presetName: string) => {
    const preset = presets?.find((p) => p.name === presetName)
    if (preset) {
      setConfig(preset.config)
      setIsDirty(true)
      setPreviewItems(null)
      setPreviewTotalAssets(0)
    }
  }

  const handlePreview = async () => {
    if (!config) return
    try {
      const result = await previewChanges(config)
      if (result) {
        setPreviewItems(result.assets)
        setPreviewTotalAssets(result.total_assets)
        setPreviewPage(1)
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const handleRecalculate = async () => {
    try {
      const result = await recalculate()
      if (result) {
        toast.success(`Recalculated risk scores for ${result.assets_updated} assets`)
        await mutate()
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  // Warn on navigation with unsaved changes
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const paginatedPreviewItems = useMemo(() => {
    if (!previewItems) return []
    const start = (previewPage - 1) * previewPageSize
    return previewItems.slice(start, start + previewPageSize)
  }, [previewItems, previewPage])

  if (isLoading || !config) {
    return <LoadingSkeleton />
  }

  const weightSum =
    config.weights.exposure +
    config.weights.criticality +
    config.weights.findings +
    config.weights.ctem
  const isWeightValid = weightSum === 100

  // Risk level threshold ordering validation
  const { critical_min, high_min, medium_min, low_min } = config.risk_levels
  const isThresholdValid =
    critical_min > high_min && high_min > medium_min && medium_min > low_min && low_min > 0
  const canSave = isDirty && isWeightValid && isThresholdValid && !isUpdating

  return (
    <Main>
      <PageHeader
        title="Scoring Configuration"
        description="Configure risk scoring weights and parameters for your organization"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!isDirty}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </PageHeader>

      {/* Preset Selector */}
      {presets && presets.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Presets
            </CardTitle>
            <CardDescription>Start from a preset optimized for your industry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {presets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePresetSelect(preset.name)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    config.preset === preset.name
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-muted-foreground/30 border-transparent'
                  }`}
                >
                  <div className="text-sm font-medium">
                    {preset.name.charAt(0).toUpperCase() + preset.name.slice(1)}
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {PRESET_DESCRIPTIONS[preset.name] || ''}
                  </div>
                </button>
              ))}
              <div
                className={`rounded-lg border p-3 text-left transition-colors ${
                  config.preset === 'custom'
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-muted-foreground/30 border-transparent'
                }`}
              >
                <div className="text-sm font-medium">Custom</div>
                <div className="text-muted-foreground mt-0.5 text-xs">
                  Manually configured values
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Component Weights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Component Weights
            </CardTitle>
            <CardDescription>
              Adjust the weight of each factor. Weights auto-balance to 100%.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <WeightDistributionBar weights={config.weights} />
            <WeightSlider
              label="Exposure"
              value={config.weights.exposure}
              onChange={(v) => updateWeight('exposure', v)}
              color="#ef4444"
              tooltip="How much the asset's network exposure (public, private, isolated) affects its risk score"
            />
            <WeightSlider
              label="Criticality"
              value={config.weights.criticality}
              onChange={(v) => updateWeight('criticality', v)}
              color="#f97316"
              tooltip="How much the asset's business criticality level affects its risk score"
            />
            <WeightSlider
              label="Findings"
              value={config.weights.findings}
              onChange={(v) => updateWeight('findings', v)}
              color="#eab308"
              tooltip="How much vulnerability findings (count or severity-weighted) affect the risk score"
            />
            <WeightSlider
              label="CTEM"
              value={config.weights.ctem}
              onChange={(v) => updateWeight('ctem', v)}
              color="#3b82f6"
              tooltip="Continuous Threat Exposure Management bonus points for factors like PII exposure, internet accessibility, and compliance risk"
            />
            {!config.ctem_points.enabled && config.weights.ctem > 0 && (
              <p className="text-muted-foreground text-xs">
                CTEM is disabled. Its weight will be redistributed to other components.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Exposure Scores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              Exposure Scores
              <InfoTip text="Base scores assigned based on how exposed an asset is to external access. Higher scores mean more risk." />
            </CardTitle>
            <CardDescription>Base score (0-100) for each exposure level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              <NumberInput
                label="Public"
                tooltip="Directly accessible from the internet"
                value={config.exposure_scores.public}
                onChange={(v) =>
                  updateConfig((c) => ({
                    ...c,
                    exposure_scores: { ...c.exposure_scores, public: v },
                  }))
                }
              />
              <NumberInput
                label="Restricted"
                tooltip="Behind VPN or firewall, limited external access"
                value={config.exposure_scores.restricted}
                onChange={(v) =>
                  updateConfig((c) => ({
                    ...c,
                    exposure_scores: { ...c.exposure_scores, restricted: v },
                  }))
                }
              />
              <NumberInput
                label="Private"
                tooltip="Internal network only, no external access"
                value={config.exposure_scores.private}
                onChange={(v) =>
                  updateConfig((c) => ({
                    ...c,
                    exposure_scores: { ...c.exposure_scores, private: v },
                  }))
                }
              />
              <NumberInput
                label="Isolated"
                tooltip="Air-gapped or completely isolated from other networks"
                value={config.exposure_scores.isolated}
                onChange={(v) =>
                  updateConfig((c) => ({
                    ...c,
                    exposure_scores: { ...c.exposure_scores, isolated: v },
                  }))
                }
              />
              <NumberInput
                label="Unknown"
                tooltip="Exposure level has not been classified"
                value={config.exposure_scores.unknown}
                onChange={(v) =>
                  updateConfig((c) => ({
                    ...c,
                    exposure_scores: { ...c.exposure_scores, unknown: v },
                  }))
                }
              />
            </div>
            <Separator className="my-4" />
            <CardDescription className="mb-2 flex items-center">
              Multipliers (0.1 - 3.0)
              <InfoTip text="Final score is multiplied by this factor based on asset exposure. A multiplier of 1.0 means no change, >1.0 amplifies risk, <1.0 reduces risk." />
            </CardDescription>
            <div className="grid grid-cols-5 gap-2">
              <NumberInput
                label="Public"
                value={config.exposure_multipliers.public}
                onChange={(v) =>
                  updateConfig((c) => ({
                    ...c,
                    exposure_multipliers: { ...c.exposure_multipliers, public: v },
                  }))
                }
                min={0.1}
                max={3.0}
                step={0.1}
              />
              <NumberInput
                label="Restricted"
                value={config.exposure_multipliers.restricted}
                onChange={(v) =>
                  updateConfig((c) => ({
                    ...c,
                    exposure_multipliers: { ...c.exposure_multipliers, restricted: v },
                  }))
                }
                min={0.1}
                max={3.0}
                step={0.1}
              />
              <NumberInput
                label="Private"
                value={config.exposure_multipliers.private}
                onChange={(v) =>
                  updateConfig((c) => ({
                    ...c,
                    exposure_multipliers: { ...c.exposure_multipliers, private: v },
                  }))
                }
                min={0.1}
                max={3.0}
                step={0.1}
              />
              <NumberInput
                label="Isolated"
                value={config.exposure_multipliers.isolated}
                onChange={(v) =>
                  updateConfig((c) => ({
                    ...c,
                    exposure_multipliers: { ...c.exposure_multipliers, isolated: v },
                  }))
                }
                min={0.1}
                max={3.0}
                step={0.1}
              />
              <NumberInput
                label="Unknown"
                value={config.exposure_multipliers.unknown}
                onChange={(v) =>
                  updateConfig((c) => ({
                    ...c,
                    exposure_multipliers: { ...c.exposure_multipliers, unknown: v },
                  }))
                }
                min={0.1}
                max={3.0}
                step={0.1}
              />
            </div>
          </CardContent>
        </Card>

        {/* Criticality Scores & Risk Level Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              Criticality & Risk Levels
              <InfoTip text="Criticality scores define the base risk score for each business criticality level. Risk level thresholds define the score boundaries that determine the final risk label (Critical, High, Medium, Low)." />
            </CardTitle>
            <CardDescription>
              Asset criticality scores and risk level threshold boundaries
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="flex items-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Criticality Scores (0-100)
                <InfoTip text="Base score assigned to each asset based on its criticality classification. A 'Critical' asset (e.g., payment gateway) gets a higher base score than a 'Low' asset (e.g., dev blog)." />
              </Label>
              <div className="mt-2 grid grid-cols-5 gap-2">
                <NumberInput
                  label="Critical"
                  value={config.criticality_scores.critical}
                  onChange={(v) =>
                    updateConfig((c) => ({
                      ...c,
                      criticality_scores: { ...c.criticality_scores, critical: v },
                    }))
                  }
                />
                <NumberInput
                  label="High"
                  value={config.criticality_scores.high}
                  onChange={(v) =>
                    updateConfig((c) => ({
                      ...c,
                      criticality_scores: { ...c.criticality_scores, high: v },
                    }))
                  }
                />
                <NumberInput
                  label="Medium"
                  value={config.criticality_scores.medium}
                  onChange={(v) =>
                    updateConfig((c) => ({
                      ...c,
                      criticality_scores: { ...c.criticality_scores, medium: v },
                    }))
                  }
                />
                <NumberInput
                  label="Low"
                  value={config.criticality_scores.low}
                  onChange={(v) =>
                    updateConfig((c) => ({
                      ...c,
                      criticality_scores: { ...c.criticality_scores, low: v },
                    }))
                  }
                />
                <NumberInput
                  label="None"
                  value={config.criticality_scores.none}
                  onChange={(v) =>
                    updateConfig((c) => ({
                      ...c,
                      criticality_scores: { ...c.criticality_scores, none: v },
                    }))
                  }
                />
              </div>
            </div>
            <Separator />
            <div>
              <div className="flex items-center justify-between">
                <Label className="flex items-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Risk Level Thresholds (min score)
                  <InfoTip text="Minimum score required for each risk level. E.g., if Critical=80, any asset with score >= 80 is labeled Critical. Must be in descending order." />
                </Label>
                {!isThresholdValid && isDirty && (
                  <span className="text-xs font-medium text-red-500">
                    Must be ordered: Critical &gt; High &gt; Medium &gt; Low &gt; 0
                  </span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                <NumberInput
                  label="Critical (min)"
                  value={config.risk_levels.critical_min}
                  onChange={(v) =>
                    updateConfig((c) => ({
                      ...c,
                      risk_levels: { ...c.risk_levels, critical_min: v },
                    }))
                  }
                  min={1}
                />
                <NumberInput
                  label="High (min)"
                  value={config.risk_levels.high_min}
                  onChange={(v) =>
                    updateConfig((c) => ({ ...c, risk_levels: { ...c.risk_levels, high_min: v } }))
                  }
                  min={1}
                />
                <NumberInput
                  label="Medium (min)"
                  value={config.risk_levels.medium_min}
                  onChange={(v) =>
                    updateConfig((c) => ({
                      ...c,
                      risk_levels: { ...c.risk_levels, medium_min: v },
                    }))
                  }
                  min={1}
                />
                <NumberInput
                  label="Low (min)"
                  value={config.risk_levels.low_min}
                  onChange={(v) =>
                    updateConfig((c) => ({ ...c, risk_levels: { ...c.risk_levels, low_min: v } }))
                  }
                  min={1}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Finding & CTEM Impact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              Finding & CTEM Impact
              <InfoTip text="Configure how vulnerability findings and CTEM threat exposure factors contribute to the overall risk score." />
            </CardTitle>
            <CardDescription>
              How findings and threat exposure factors affect scores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="flex items-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Finding Impact
                <InfoTip text="Determines how vulnerability findings on an asset affect its score. Count-based adds fixed points per finding. Severity-weighted adds different points based on finding severity." />
              </Label>
              <div className="mt-2 space-y-3">
                <div className="space-y-1">
                  <Label className="flex items-center text-xs">
                    Mode
                    <InfoTip text="Count-based: each finding adds fixed points regardless of severity. Severity-weighted: each finding adds points based on its severity level (Critical findings add more than Info findings)." />
                  </Label>
                  <Select
                    value={config.finding_impact.mode}
                    onValueChange={(v) =>
                      updateConfig((c) => ({
                        ...c,
                        finding_impact: {
                          ...c.finding_impact,
                          mode: v as 'count' | 'severity_weighted',
                        },
                      }))
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Count-based</SelectItem>
                      <SelectItem value="severity_weighted">Severity-weighted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {config.finding_impact.mode === 'count' && (
                    <NumberInput
                      label="Per-finding points"
                      tooltip="Points added to the score for each open finding on this asset"
                      value={config.finding_impact.per_finding_points}
                      onChange={(v) =>
                        updateConfig((c) => ({
                          ...c,
                          finding_impact: { ...c.finding_impact, per_finding_points: v },
                        }))
                      }
                      min={1}
                      max={50}
                    />
                  )}
                  <NumberInput
                    label="Finding cap"
                    tooltip="Maximum number of findings counted toward the score. Prevents a single heavily-scanned asset from getting an unfairly high score."
                    value={config.finding_impact.finding_cap}
                    onChange={(v) =>
                      updateConfig((c) => ({
                        ...c,
                        finding_impact: { ...c.finding_impact, finding_cap: v },
                      }))
                    }
                    min={1}
                    max={100}
                  />
                </div>
                {config.finding_impact.mode === 'severity_weighted' && (
                  <div>
                    <Label className="flex items-center text-xs">
                      Severity Weights (points per finding)
                      <InfoTip text="Points added per finding of each severity. E.g., if Critical=10 and an asset has 3 critical findings, it adds 30 points (capped by Finding Cap)." />
                    </Label>
                    <div className="mt-1 grid grid-cols-5 gap-2">
                      <NumberInput
                        label="Critical"
                        value={config.finding_impact.severity_weights.critical}
                        onChange={(v) =>
                          updateConfig((c) => ({
                            ...c,
                            finding_impact: {
                              ...c.finding_impact,
                              severity_weights: {
                                ...c.finding_impact.severity_weights,
                                critical: v,
                              },
                            },
                          }))
                        }
                        max={50}
                      />
                      <NumberInput
                        label="High"
                        value={config.finding_impact.severity_weights.high}
                        onChange={(v) =>
                          updateConfig((c) => ({
                            ...c,
                            finding_impact: {
                              ...c.finding_impact,
                              severity_weights: { ...c.finding_impact.severity_weights, high: v },
                            },
                          }))
                        }
                        max={50}
                      />
                      <NumberInput
                        label="Medium"
                        value={config.finding_impact.severity_weights.medium}
                        onChange={(v) =>
                          updateConfig((c) => ({
                            ...c,
                            finding_impact: {
                              ...c.finding_impact,
                              severity_weights: { ...c.finding_impact.severity_weights, medium: v },
                            },
                          }))
                        }
                        max={50}
                      />
                      <NumberInput
                        label="Low"
                        value={config.finding_impact.severity_weights.low}
                        onChange={(v) =>
                          updateConfig((c) => ({
                            ...c,
                            finding_impact: {
                              ...c.finding_impact,
                              severity_weights: { ...c.finding_impact.severity_weights, low: v },
                            },
                          }))
                        }
                        max={50}
                      />
                      <NumberInput
                        label="Info"
                        value={config.finding_impact.severity_weights.info}
                        onChange={(v) =>
                          updateConfig((c) => ({
                            ...c,
                            finding_impact: {
                              ...c.finding_impact,
                              severity_weights: { ...c.finding_impact.severity_weights, info: v },
                            },
                          }))
                        }
                        max={50}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Separator />
            <div>
              <div className="flex items-center justify-between">
                <Label className="flex items-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  CTEM Bonus Points
                  <InfoTip text="Additional points added to the CTEM component based on specific threat exposure attributes of each asset. Points are additive (an asset with PII + internet exposure gets both bonuses)." />
                </Label>
                <div className="flex items-center gap-2">
                  <Switch
                    id="ctem-toggle"
                    checked={config.ctem_points.enabled}
                    onCheckedChange={(v) =>
                      updateConfig((c) => ({ ...c, ctem_points: { ...c.ctem_points, enabled: v } }))
                    }
                  />
                  <Label htmlFor="ctem-toggle" className="text-xs">
                    Enabled
                  </Label>
                </div>
              </div>
              {config.ctem_points.enabled && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <NumberInput
                    label="Internet Accessible"
                    tooltip="Bonus points for assets directly reachable from the internet"
                    value={config.ctem_points.internet_accessible}
                    onChange={(v) =>
                      updateConfig((c) => ({
                        ...c,
                        ctem_points: { ...c.ctem_points, internet_accessible: v },
                      }))
                    }
                  />
                  <NumberInput
                    label="PII Exposed"
                    tooltip="Bonus points for assets that process or store Personally Identifiable Information"
                    value={config.ctem_points.pii_exposed}
                    onChange={(v) =>
                      updateConfig((c) => ({
                        ...c,
                        ctem_points: { ...c.ctem_points, pii_exposed: v },
                      }))
                    }
                  />
                  <NumberInput
                    label="PHI Exposed"
                    tooltip="Bonus points for assets that process or store Protected Health Information (HIPAA)"
                    value={config.ctem_points.phi_exposed}
                    onChange={(v) =>
                      updateConfig((c) => ({
                        ...c,
                        ctem_points: { ...c.ctem_points, phi_exposed: v },
                      }))
                    }
                  />
                  <NumberInput
                    label="High Risk Compliance"
                    tooltip="Bonus points for assets under high-risk compliance frameworks (PCI-DSS, SOX, etc.)"
                    value={config.ctem_points.high_risk_compliance}
                    onChange={(v) =>
                      updateConfig((c) => ({
                        ...c,
                        ctem_points: { ...c.ctem_points, high_risk_compliance: v },
                      }))
                    }
                  />
                  <NumberInput
                    label="Restricted Data"
                    tooltip="Bonus points for assets that handle classified or restricted data"
                    value={config.ctem_points.restricted_data}
                    onChange={(v) =>
                      updateConfig((c) => ({
                        ...c,
                        ctem_points: { ...c.ctem_points, restricted_data: v },
                      }))
                    }
                  />
                </div>
              )}
              {!config.ctem_points.enabled && (
                <p className="text-muted-foreground mt-1 text-xs">
                  CTEM scoring is disabled. Enable to add bonus points for threat exposure factors.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Changes — full width for table readability */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview Changes
              </CardTitle>
              <CardDescription className="mt-1.5">
                See how score changes affect a sample of assets
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handlePreview} disabled={isPreviewing || !isDirty}>
              {isPreviewing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              Preview Impact
            </Button>
          </div>
        </CardHeader>
        {previewItems && previewItems.length > 0 && (
          <CardContent>
            <p className="text-muted-foreground mb-2 text-xs">
              Showing {previewItems.length} sampled assets out of{' '}
              {previewTotalAssets.toLocaleString()} total (top risk, bottom risk, and random
              sample).
            </p>
            <div className="max-h-80 overflow-auto rounded border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left font-medium">Asset</th>
                    <th className="p-2 text-left font-medium">Type</th>
                    <th className="p-2 text-right font-medium">Current</th>
                    <th className="p-2 text-right font-medium">New</th>
                    <th className="p-2 text-right font-medium">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPreviewItems.map((item) => (
                    <tr key={item.asset_id} className="border-t">
                      <td className="max-w-[300px] truncate p-2">{item.asset_name}</td>
                      <td className="text-muted-foreground p-2 text-xs">{item.asset_type}</td>
                      <td className="p-2 text-right">{item.current_score}</td>
                      <td className="p-2 text-right">{item.new_score}</td>
                      <td
                        className={`p-2 text-right font-medium ${item.delta > 0 ? 'text-red-500' : item.delta < 0 ? 'text-green-500' : ''}`}
                      >
                        {item.delta > 0 ? '+' : ''}
                        {item.delta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewItems.length > previewPageSize && (
              <div className="mt-3">
                <Pagination
                  currentPage={previewPage}
                  totalPages={Math.ceil(previewItems.length / previewPageSize)}
                  pageSize={previewPageSize}
                  totalItems={previewItems.length}
                  onPageChange={setPreviewPage}
                  showPageSizeSelector={false}
                />
              </div>
            )}
          </CardContent>
        )}
        {previewItems && previewItems.length === 0 && (
          <CardContent>
            <p className="text-muted-foreground text-sm">No assets to preview.</p>
          </CardContent>
        )}
      </Card>

      {/* Recalculate & How Scoring Works — side by side */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Recalculate Scores
            </CardTitle>
            <CardDescription>
              Apply current scoring configuration to all assets. This may take a moment for large
              portfolios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isRecalculating || isDirty}>
                  {isRecalculating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4" />
                  )}
                  Recalculate All Scores
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Recalculate Risk Scores</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will recalculate risk scores for all assets using the current saved
                    configuration. This operation cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRecalculate}>Recalculate</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {isDirty && (
              <p className="text-muted-foreground mt-2 text-xs">
                Save changes before recalculating.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              How Scoring Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground space-y-2 text-sm">
              <p>
                <strong className="text-foreground">Formula:</strong> Score = (Exposure x W1 +
                Criticality x W2 + Findings x W3 + CTEM x W4) x Multiplier
              </p>
              <p>
                Each component produces a score (0-100) weighted by its percentage. The exposure
                multiplier adjusts the final score. Result is clamped to 0-100.
              </p>
              <p>
                When CTEM is disabled, its weight is redistributed proportionally to the other
                components.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
