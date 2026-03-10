'use client'

import { useState, useEffect, useCallback } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  Shield,
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
}: {
  label: string
  value: number
  onChange: (v: number) => void
  color: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
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

function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
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
      await updateRiskScoring(config)
      await mutate()
      setIsDirty(false)
      toast.success('Scoring configuration saved')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const handleReset = () => {
    if (settings) {
      setConfig(settings)
      setIsDirty(false)
      setPreviewItems(null)
    }
  }

  const handlePresetSelect = (presetName: string) => {
    const preset = presets?.find((p) => p.name === presetName)
    if (preset) {
      setConfig(preset.config)
      setIsDirty(true)
      setPreviewItems(null)
    }
  }

  const handlePreview = async () => {
    if (!config) return
    try {
      const result = await previewChanges(config)
      if (result) {
        setPreviewItems(result.assets)
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
              {config.preset === 'custom' && (
                <div className="flex items-center justify-center rounded-lg border border-dashed p-3">
                  <Badge variant="secondary">Custom</Badge>
                </div>
              )}
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
            />
            <WeightSlider
              label="Criticality"
              value={config.weights.criticality}
              onChange={(v) => updateWeight('criticality', v)}
              color="#f97316"
            />
            <WeightSlider
              label="Findings"
              value={config.weights.findings}
              onChange={(v) => updateWeight('findings', v)}
              color="#eab308"
            />
            <WeightSlider
              label="CTEM"
              value={config.weights.ctem}
              onChange={(v) => updateWeight('ctem', v)}
              color="#3b82f6"
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
            <CardTitle>Exposure Scores</CardTitle>
            <CardDescription>Base score (0-100) for each exposure level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              <NumberInput
                label="Public"
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
            <CardDescription className="mb-2">Multipliers (0.1 - 3.0)</CardDescription>
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

        {/* Criticality Scores */}
        <Card>
          <CardHeader>
            <CardTitle>Criticality Scores</CardTitle>
            <CardDescription>Base score (0-100) for each criticality level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
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
          </CardContent>
        </Card>

        {/* Finding Impact */}
        <Card>
          <CardHeader>
            <CardTitle>Finding Impact</CardTitle>
            <CardDescription>How findings affect the risk score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm">Mode</Label>
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
              <>
                <Label className="text-xs">Severity Weights (points per finding)</Label>
                <div className="grid grid-cols-5 gap-2">
                  <NumberInput
                    label="Critical"
                    value={config.finding_impact.severity_weights.critical}
                    onChange={(v) =>
                      updateConfig((c) => ({
                        ...c,
                        finding_impact: {
                          ...c.finding_impact,
                          severity_weights: { ...c.finding_impact.severity_weights, critical: v },
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
              </>
            )}
          </CardContent>
        </Card>

        {/* CTEM Factors */}
        <Card>
          <CardHeader>
            <CardTitle>CTEM Factors</CardTitle>
            <CardDescription>Continuous Threat Exposure Management points</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={config.ctem_points.enabled}
                onCheckedChange={(v) =>
                  updateConfig((c) => ({ ...c, ctem_points: { ...c.ctem_points, enabled: v } }))
                }
              />
              <Label>Enable CTEM scoring</Label>
            </div>
            {config.ctem_points.enabled && (
              <div className="grid grid-cols-2 gap-2">
                <NumberInput
                  label="Internet Accessible"
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
          </CardContent>
        </Card>

        {/* Risk Level Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Level Thresholds
            </CardTitle>
            <CardDescription>
              Minimum score (1-100) for each risk level. Must be in descending order.
              {!isThresholdValid && isDirty && (
                <span className="mt-1 block font-medium text-red-500">
                  Thresholds must be ordered: Critical &gt; High &gt; Medium &gt; Low &gt; 0
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
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
                  updateConfig((c) => ({ ...c, risk_levels: { ...c.risk_levels, medium_min: v } }))
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
          </CardContent>
        </Card>
      </div>

      {/* Actions & Preview */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview Changes
            </CardTitle>
            <CardDescription>See how score changes affect a sample of assets</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={isPreviewing || !isDirty}
              className="mb-4"
            >
              {isPreviewing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              Preview Impact
            </Button>
            {previewItems && previewItems.length > 0 && (
              <div className="max-h-64 overflow-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left font-medium">Asset</th>
                      <th className="p-2 text-right font-medium">Current</th>
                      <th className="p-2 text-right font-medium">New</th>
                      <th className="p-2 text-right font-medium">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewItems.map((item) => (
                      <tr key={item.asset_id} className="border-t">
                        <td className="p-2 truncate max-w-[200px]">{item.asset_name}</td>
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
            )}
            {previewItems && previewItems.length === 0 && (
              <p className="text-muted-foreground text-sm">No assets to preview.</p>
            )}
          </CardContent>
        </Card>

        {/* Recalculate & Info */}
        <div className="space-y-6">
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
      </div>
    </Main>
  )
}
