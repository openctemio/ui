'use client'

import { useState, useCallback, useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Lock,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  Sparkles,
  Check,
  type LucideIcon,
  Package,
  Database,
  ShieldAlert,
  Globe,
  Bug,
  Crosshair,
  Cloud,
  ClipboardCheck,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'
import { ApiClientError, getErrorMessage } from '@/lib/api/error-handler'
import { fetcherWithOptions } from '@/lib/api/client'
import { tenantEndpoints } from '@/lib/api/endpoints'
import {
  useTenantModules,
  useUpdateTenantModules,
  useResetTenantModules,
  useModuleDependencyGraph,
  useModulePresets,
  useModuleRealtimeInvalidation,
} from '@/features/organization/api/use-tenant-modules'
import type {
  TenantModule,
  TenantSubModule,
  ModuleToggle,
  ToggleIssue,
  ModulePreset,
  PresetDiff,
} from '@/features/organization/api/use-tenant-modules'

// Details payload nested under ApiClientError.details when the backend
// rejects a toggle because of the dependency graph. Shape mirrors
// tenant_handler.writeToggleErrorJSON.
interface ModuleDependencyErrorDetails {
  module_id: string
  module_name: string
  action: 'enable' | 'disable'
  blockers?: ToggleIssue[]
  required?: ToggleIssue[]
}

// A dependency edge enriched with its kind — same shape as
// DependencyEdge but re-declared locally so the reverse-map type is
// self-documenting.
type DependencyEdgeWithKind = {
  from: string
  to: string
  type: 'hard' | 'soft'
  reason: string
}

// Category display labels
const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core',
  discovery: 'Discovery',
  prioritization: 'Prioritization',
  validation: 'Validation',
  mobilization: 'Mobilization',
  insights: 'Insights',
  settings: 'Settings',
  data: 'Data',
  operations: 'Operations',
  platform: 'Platform',
}

// Map preset.icon (string from backend) → lucide component. Fallback
// to Sparkles so unknown icons don't crash the render path.
const PRESET_ICONS: Record<string, LucideIcon> = {
  Package,
  Database,
  ShieldAlert,
  Globe,
  Bug,
  Crosshair,
  Cloud,
  ClipboardCheck,
  Layers,
  Sparkles,
}

export default function ModuleManagementPage() {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.id

  const { modules, summary, isLoading, mutate } = useTenantModules(tenantId)
  const { updateModules, isUpdating } = useUpdateTenantModules(tenantId)
  const { resetModules, isResetting } = useResetTenantModules(tenantId)
  const { edges: dependencyEdges } = useModuleDependencyGraph(tenantId)
  const { presets } = useModulePresets(tenantId)
  const { mutate: globalMutate } = useSWRConfig()
  // Subscribe to "module.updated" WS events on the tenant channel so
  // an admin in another tab (or another admin) flipping a module
  // reflects on this page within ~100ms instead of waiting for the
  // 5-min SWR dedup window.
  useModuleRealtimeInvalidation(tenantId)

  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({})
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [coreExpanded, setCoreExpanded] = useState(false)
  // Preset picker state. `selectedPreset` holds the preset the admin
  // clicked (triggering the diff preview fetch). `presetDiff` holds
  // the preview response; once populated, we show the confirm dialog.
  const [selectedPreset, setSelectedPreset] = useState<ModulePreset | null>(null)
  const [presetDiff, setPresetDiff] = useState<PresetDiff | null>(null)
  const [isApplyingPreset, setIsApplyingPreset] = useState(false)
  // Dependency-conflict dialog surfaced when the backend rejects a
  // save with code=module_dependency_violation. Stores the structured
  // ToggleError details so the modal can list blockers/required.
  const [depConflict, setDepConflict] = useState<ModuleDependencyErrorDetails | null>(null)

  // Two reverse maps from the platform dependency graph:
  //   requires[id]    = modules that `id` needs (its OUT-edges)
  //   requiredBy[id]  = modules that need `id` (its IN-edges)
  // Badge renderer reads these to show "Needs N" + "Used by N"
  // next to each module. Recomputed only when edges change.
  const { requires, requiredBy } = useMemo(() => {
    const req: Record<string, DependencyEdgeWithKind[]> = {}
    const by: Record<string, DependencyEdgeWithKind[]> = {}
    for (const e of dependencyEdges) {
      ;(req[e.from] ||= []).push(e)
      ;(by[e.to] ||= []).push(e)
    }
    return { requires: req, requiredBy: by }
  }, [dependencyEdges])

  // Name lookup for badge tooltips — translates module IDs from the
  // dep graph into display names from the tenant-modules response.
  const moduleNames = useMemo(() => {
    const map: Record<string, string> = {}
    for (const m of modules) map[m.id] = m.name
    return map
  }, [modules])

  const isDirty = Object.keys(pendingChanges).length > 0

  const getEffectiveEnabled = useCallback(
    (mod: TenantModule) => {
      if (mod.id in pendingChanges) return pendingChanges[mod.id]
      return mod.is_enabled
    },
    [pendingChanges]
  )

  // Split modules into Core and Toggleable, filtering out deprecated
  const { coreModules, featureModules } = useMemo(() => {
    const core: TenantModule[] = []
    const features: TenantModule[] = []
    for (const mod of modules) {
      // Hide deprecated modules entirely
      if (mod.release_status === 'deprecated') continue
      if (mod.is_core) {
        core.push(mod)
      } else {
        features.push(mod)
      }
    }
    return {
      coreModules: core.sort((a, b) => a.display_order - b.display_order),
      featureModules: features.sort((a, b) => a.display_order - b.display_order),
    }
  }, [modules])

  // Build a lookup for server state of all modules + sub-modules
  const serverStateMap = useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const mod of modules) {
      map[mod.id] = mod.is_enabled
      if (mod.sub_modules) {
        for (const sub of mod.sub_modules) {
          map[sub.id] = sub.is_enabled
        }
      }
    }
    return map
  }, [modules])

  const toggleModule = useCallback(
    (moduleId: string, currentEnabled: boolean) => {
      setPendingChanges((prev) => {
        const next = { ...prev }
        const newValue = !currentEnabled

        // If toggling back to server state, remove the pending change
        if (serverStateMap[moduleId] === newValue) {
          delete next[moduleId]
        } else {
          next[moduleId] = newValue
        }
        return next
      })
    },
    [serverStateMap]
  )

  // Shared save logic — accepts an explicit pending map so the cascade
  // path can call it with the merged changes WITHOUT racing setState.
  // (setPendingChanges is async; calling handleSave right after a merge
  // would otherwise send the old toggles.)
  const runSave = useCallback(
    async (pending: Record<string, boolean>) => {
      const toggles: ModuleToggle[] = Object.entries(pending).map(([moduleId, isEnabled]) => ({
        module_id: moduleId,
        is_enabled: isEnabled,
      }))

      try {
        const result = await updateModules({ modules: toggles })
        if (result) {
          await mutate(result, false)
        }
        setPendingChanges({})
        await globalMutate('/api/v1/me/modules')
        toast.success('Modules updated successfully')

        for (const w of result?.warnings ?? []) {
          toast.warning(`${w.name} will degrade`, { description: w.reason, duration: 6000 })
        }
      } catch (err) {
        if (
          err instanceof ApiClientError &&
          err.code === 'module_dependency_violation' &&
          err.details
        ) {
          setDepConflict(err.details as unknown as ModuleDependencyErrorDetails)
          return
        }
        toast.error(getErrorMessage(err))
      }
    },
    [updateModules, mutate, globalMutate]
  )

  const handleSave = useCallback(async () => {
    if (!isDirty) return
    await runSave(pendingChanges)
  }, [isDirty, pendingChanges, runSave])

  // Cascade resolver — when the backend blocks a toggle, the user can
  // click "Disable them too" (or "Enable required") to flip the
  // dependents automatically and retry in one step. We merge the new
  // IDs into the pending map, update state, and immediately save the
  // merged map — no need to wait for a re-render since runSave takes
  // the explicit map.
  const handleCascadeResolve = useCallback(async () => {
    if (!depConflict) return

    const cascade: Record<string, boolean> = { ...pendingChanges }
    if (depConflict.action === 'disable') {
      for (const b of depConflict.blockers ?? []) {
        cascade[b.module_id] = false
      }
    } else {
      for (const r of depConflict.required ?? []) {
        cascade[r.module_id] = true
      }
    }

    setPendingChanges(cascade)
    setDepConflict(null)
    await runSave(cascade)
  }, [depConflict, pendingChanges, runSave])

  const handleDiscard = useCallback(() => {
    setPendingChanges({})
  }, [])

  // Preset picker — clicking a preset card fetches the dry-run diff
  // from the backend and opens the confirm dialog. The diff tells the
  // admin exactly which modules will flip so there are no surprises.
  const handlePresetPreview = useCallback(
    async (preset: ModulePreset) => {
      if (!tenantId) return
      setSelectedPreset(preset)
      setPresetDiff(null)
      try {
        const diff = await fetcherWithOptions<PresetDiff>(
          tenantEndpoints.modulesPresetPreview(tenantId, preset.id),
          { method: 'POST' }
        )
        setPresetDiff(diff)
      } catch (err) {
        toast.error(getErrorMessage(err))
        setSelectedPreset(null)
      }
    },
    [tenantId]
  )

  const handlePresetApply = useCallback(async () => {
    if (!tenantId || !selectedPreset) return
    setIsApplyingPreset(true)
    try {
      await fetcherWithOptions(tenantEndpoints.modulesPresetApply(tenantId, selectedPreset.id), {
        method: 'POST',
      })
      // Refresh the module list + sidebar so the page reflects the
      // new state immediately (fresh fetch is safer than client-side
      // re-computation for a bulk change that touched many modules).
      await mutate()
      await globalMutate('/api/v1/me/modules')
      toast.success(`Applied preset: ${selectedPreset.name}`)
      setPendingChanges({})
      setSelectedPreset(null)
      setPresetDiff(null)
    } catch (err) {
      // Dependency-violation handling: surface the structured error
      // through the existing conflict dialog so the admin can cascade-
      // resolve, same UX as manual toggles.
      if (
        err instanceof ApiClientError &&
        err.code === 'module_dependency_violation' &&
        err.details
      ) {
        setDepConflict(err.details as unknown as ModuleDependencyErrorDetails)
        setSelectedPreset(null)
        setPresetDiff(null)
      } else {
        toast.error(getErrorMessage(err))
      }
    } finally {
      setIsApplyingPreset(false)
    }
  }, [tenantId, selectedPreset, mutate, globalMutate])

  const handleReset = useCallback(async () => {
    try {
      const result = await resetModules()
      if (result) {
        await mutate(result, false)
      }
      setPendingChanges({})
      setShowResetDialog(false)
      // Invalidate sidebar module cache so changes reflect immediately
      await globalMutate('/api/v1/me/modules')
      toast.success('Modules reset to defaults (all enabled)')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [resetModules, mutate, globalMutate])

  const pendingEnabled = Object.values(pendingChanges).filter(Boolean).length
  const pendingDisabled = Object.values(pendingChanges).filter((v) => !v).length

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Module Management"
          description="Configure which modules are available for your organization"
        />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </Main>
    )
  }

  return (
    <Main>
      <div className="flex items-center justify-between">
        <PageHeader
          title="Module Management"
          description="Enable or disable modules for your organization. Core modules required for platform operation cannot be disabled."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowResetDialog(true)}
          disabled={isResetting}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryCard label="Total Modules" value={summary.total} />
          <SummaryCard
            label="Enabled"
            value={summary.enabled + pendingEnabled - pendingDisabled}
            variant="success"
          />
          <SummaryCard
            label="Disabled"
            value={summary.disabled - pendingEnabled + pendingDisabled}
            variant="muted"
          />
          <SummaryCard label="Core (Always On)" value={summary.core} variant="info" />
        </div>
      )}

      {/* Preset picker — curated bundles for common use cases.
          Renders above the manual toggle area so admins see the
          "don't toggle 100 things, pick a bundle" affordance first. */}
      {presets.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base">Quick start with a preset</CardTitle>
              <Badge variant="outline" className="text-xs">
                {presets.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Curated module bundles for common use cases. Applying a preset overwrites your current
              module configuration — review the diff before committing.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {presets.map((p) => {
                const Icon = PRESET_ICONS[p.icon] ?? Sparkles
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetPreview(p)}
                    className="text-left rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/50 transition-colors p-3 flex flex-col gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium text-sm truncate">{p.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                        {p.module_count}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      For: {p.target_persona}
                    </p>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className={`mt-6 space-y-4 ${isDirty ? 'pb-20' : ''}`}>
        {/* Core Modules - Collapsed by default */}
        {coreModules.length > 0 && (
          <Card>
            <CardHeader
              className="cursor-pointer select-none py-3"
              onClick={() => setCoreExpanded(!coreExpanded)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {coreExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <CardTitle className="text-base">Core Modules</CardTitle>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Lock className="h-3 w-3" />
                    Always On
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {coreModules.length}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            {coreExpanded && (
              <CardContent className="pt-0">
                <div className="divide-y">
                  {coreModules.map((mod) => (
                    <ModuleRow
                      key={mod.id}
                      mod={mod}
                      isEnabled={true}
                      hasPendingChange={false}
                      pendingChanges={pendingChanges}
                      isUpdating={isUpdating}
                      onToggle={toggleModule}
                      requires={requires[mod.id]}
                      requiredBy={requiredBy[mod.id]}
                      moduleNames={moduleNames}
                    />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Feature Modules - Expanded by default */}
        {featureModules.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Modules</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {featureModules.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y">
                {featureModules.map((mod) => {
                  const isEnabled = getEffectiveEnabled(mod)
                  const hasPendingChange = mod.id in pendingChanges

                  return (
                    <ModuleRow
                      key={mod.id}
                      mod={mod}
                      isEnabled={isEnabled}
                      hasPendingChange={hasPendingChange}
                      pendingChanges={pendingChanges}
                      isUpdating={isUpdating}
                      onToggle={toggleModule}
                      requires={requires[mod.id]}
                      requiredBy={requiredBy[mod.id]}
                      moduleNames={moduleNames}
                    />
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sticky Save Bar */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-4 shadow-lg">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {pendingEnabled > 0 && (
                <span className="text-green-600 mr-3">+{pendingEnabled} enabling</span>
              )}
              {pendingDisabled > 0 && (
                <span className="text-red-600">-{pendingDisabled} disabling</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDiscard}>
                Discard
              </Button>
              <Button onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dependency-violation Dialog — shown when the backend rejects
          a save because of the module graph. Lists the concrete modules
          the admin needs to flip before the proposed toggle will take. */}
      <AlertDialog open={!!depConflict} onOpenChange={(open) => !open && setDepConflict(null)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {depConflict?.action === 'disable'
                ? `Cannot disable "${depConflict.module_name}"`
                : `Cannot enable "${depConflict?.module_name ?? ''}"`}
            </AlertDialogTitle>
            {/* Short plain-text description for screen readers only —
                the rich block-level content below renders outside the
                <p> element to avoid invalid nested <p> hydration errors. */}
            <AlertDialogDescription className="sr-only">
              {depConflict?.action === 'disable'
                ? `${depConflict.blockers?.length ?? 0} dependent module(s) block disabling ${depConflict.module_name}`
                : `${depConflict?.required?.length ?? 0} module(s) must be enabled before ${depConflict?.module_name ?? ''}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-sm">
            {depConflict?.action === 'disable' && (depConflict.blockers?.length ?? 0) > 0 && (
              <div>
                <div className="text-muted-foreground">
                  The following{' '}
                  <span className="font-semibold">{depConflict.blockers?.length}</span> module(s)
                  depend on <span className="font-medium">{depConflict.module_name}</span>. You can
                  disable them all together, or cancel and handle them manually:
                </div>
                <ul className="mt-2 space-y-1.5">
                  {depConflict.blockers?.map((b) => (
                    <li
                      key={b.module_id}
                      className="rounded border border-amber-200 bg-amber-50/50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-amber-900">{b.name}</div>
                        <code className="text-[10px] text-amber-700/60">{b.module_id}</code>
                      </div>
                      <div className="text-xs text-amber-800/80 mt-0.5">{b.reason}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {depConflict?.action === 'enable' && (depConflict.required?.length ?? 0) > 0 && (
              <div>
                <div className="text-muted-foreground">
                  <span className="font-medium">{depConflict.module_name}</span> requires{' '}
                  <span className="font-semibold">{depConflict.required?.length}</span> other
                  module(s) that are currently disabled. You can enable them all together, or cancel
                  and handle them manually:
                </div>
                <ul className="mt-2 space-y-1.5">
                  {depConflict.required?.map((r) => (
                    <li
                      key={r.module_id}
                      className="rounded border border-amber-200 bg-amber-50/50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-amber-900">{r.name}</div>
                        <code className="text-[10px] text-amber-700/60">{r.module_id}</code>
                      </div>
                      <div className="text-xs text-amber-800/80 mt-0.5">{r.reason}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDepConflict(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCascadeResolve} disabled={isUpdating}>
              {depConflict?.action === 'disable'
                ? `Disable ${depConflict.blockers?.length ?? 0} dependent module(s) & retry`
                : `Enable ${depConflict?.required?.length ?? 0} required module(s) & retry`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preset Confirm Dialog — shown after the diff preview resolves.
          Lists every module that will flip so the admin isn't surprised
          by a bulk change. Dependency violations (if any) fall through
          to the shared depConflict dialog via handlePresetApply's catch. */}
      <AlertDialog
        open={!!selectedPreset}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPreset(null)
            setPresetDiff(null)
          }
        }}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Apply preset: {selectedPreset?.name}
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              {selectedPreset?.description ?? ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-sm">
            {selectedPreset && (
              <div className="text-muted-foreground">{selectedPreset.description}</div>
            )}
            {selectedPreset && selectedPreset.key_outcomes.length > 0 && (
              <div>
                <div className="text-xs font-medium text-foreground mb-1">What you get</div>
                <ul className="space-y-0.5">
                  {selectedPreset.key_outcomes.map((k, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <Check className="h-3 w-3 text-green-600 shrink-0 mt-0.5" />
                      <span>{k}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!presetDiff && (
              <div className="text-xs text-muted-foreground italic">Computing diff…</div>
            )}
            {presetDiff &&
              (() => {
                // Backend may serialise empty slices as null on older
                // clients — fall back to [] so .length / .map are safe.
                const toEnable = presetDiff.to_enable ?? []
                const toDisable = presetDiff.to_disable ?? []
                return (
                  <div className="rounded border bg-muted/30 p-3 space-y-2">
                    <div className="text-xs font-medium">Changes if applied</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-green-600 font-medium">+{toEnable.length}</span>{' '}
                        <span className="text-muted-foreground">enabling</span>
                      </div>
                      <div>
                        <span className="text-red-600 font-medium">-{toDisable.length}</span>{' '}
                        <span className="text-muted-foreground">disabling</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {presetDiff.unchanged} unchanged
                        </span>
                      </div>
                    </div>
                    {toDisable.length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-red-700 hover:underline">
                          {toDisable.length} module(s) will be disabled
                        </summary>
                        <ul className="mt-1.5 pl-3 space-y-0.5 max-h-32 overflow-y-auto">
                          {toDisable.map((m) => (
                            <li key={m.module_id} className="text-muted-foreground">
                              {m.name}{' '}
                              <code className="text-[10px] text-muted-foreground/60">
                                {m.module_id}
                              </code>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {toEnable.length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-green-700 hover:underline">
                          {toEnable.length} module(s) will be enabled
                        </summary>
                        <ul className="mt-1.5 pl-3 space-y-0.5 max-h-32 overflow-y-auto">
                          {toEnable.map((m) => (
                            <li key={m.module_id} className="text-muted-foreground">
                              {m.name}{' '}
                              <code className="text-[10px] text-muted-foreground/60">
                                {m.module_id}
                              </code>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )
              })()}
            {isDirty && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                You have unsaved manual changes. Applying a preset will discard them.
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePresetApply}
              disabled={!presetDiff || isApplyingPreset}
            >
              {isApplyingPreset ? 'Applying…' : 'Apply preset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Modules to Defaults</AlertDialogTitle>
            <AlertDialogDescription>
              This will enable all modules for your organization. Any modules you previously
              disabled will be re-enabled. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={isResetting}>
              {isResetting ? 'Resetting...' : 'Reset All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Main>
  )
}

// ============================================
// HELPER COMPONENTS
// ============================================

function ModuleRow({
  mod,
  isEnabled,
  hasPendingChange,
  pendingChanges,
  isUpdating,
  onToggle,
  requires = [],
  requiredBy = [],
  moduleNames = {},
}: {
  mod: TenantModule
  isEnabled: boolean
  hasPendingChange: boolean
  pendingChanges: Record<string, boolean>
  isUpdating: boolean
  onToggle: (moduleId: string, currentEnabled: boolean) => void
  requires?: DependencyEdgeWithKind[]
  requiredBy?: DependencyEdgeWithKind[]
  moduleNames?: Record<string, string>
}) {
  const hasSubModules = mod.sub_modules && mod.sub_modules.length > 0
  const categoryLabel = CATEGORY_LABELS[mod.category] || mod.category

  // Filter out deprecated sub-modules; keep coming_soon (shown as disabled)
  const visibleSubModules = hasSubModules
    ? mod.sub_modules!.filter((sub) => sub.release_status !== 'deprecated')
    : []

  // Count only HARD edges for the compact badges — soft edges are
  // surfaced as warnings post-save, they're noisy in the row header.
  const hardRequires = requires.filter((e) => e.type === 'hard')
  const hardRequiredBy = requiredBy.filter((e) => e.type === 'hard')

  return (
    <div>
      <div
        className={`flex items-center justify-between py-3 ${
          hasPendingChange ? 'bg-muted/30 -mx-3 px-3 rounded' : ''
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{mod.name}</span>
            {!mod.is_core && categoryLabel && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                {categoryLabel}
              </Badge>
            )}
            {mod.release_status === 'beta' && (
              <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                Beta
              </Badge>
            )}
            {mod.release_status === 'coming_soon' && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                Coming Soon
              </Badge>
            )}
            {hasPendingChange && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                Modified
              </Badge>
            )}
            {/* Dependency badges — click to see the full list in a tooltip-like
                title. Kept compact so they don't dominate the row. */}
            {hardRequires.length > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 gap-0.5 text-sky-700 border-sky-300"
                title={`Requires: ${hardRequires.map((e) => moduleNames[e.to] ?? e.to).join(', ')}`}
              >
                <ArrowUpRight className="h-2.5 w-2.5" />
                Needs {hardRequires.length}
              </Badge>
            )}
            {hardRequiredBy.length > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 gap-0.5 text-purple-700 border-purple-300"
                title={`Required by: ${hardRequiredBy
                  .map((e) => moduleNames[e.from] ?? e.from)
                  .join(', ')}`}
              >
                <ArrowDownRight className="h-2.5 w-2.5" />
                Used by {hardRequiredBy.length}
              </Badge>
            )}
            {visibleSubModules.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({visibleSubModules.length} sub-modules)
              </span>
            )}
          </div>
          {mod.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{mod.description}</p>
          )}
        </div>
        <div className="ml-4">
          <Switch
            checked={isEnabled}
            onCheckedChange={() => onToggle(mod.id, isEnabled)}
            disabled={mod.is_core || isUpdating}
            aria-label={`Toggle ${mod.name}`}
          />
        </div>
      </div>
      {visibleSubModules.length > 0 && (
        <div
          className={`pb-2 pl-6 space-y-0.5 ${!isEnabled ? 'opacity-40 pointer-events-none' : ''}`}
        >
          {visibleSubModules.map((sub) => (
            <SubModuleRow
              key={sub.id}
              sub={sub}
              parentEnabled={isEnabled}
              pendingChanges={pendingChanges}
              isUpdating={isUpdating}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SubModuleRow({
  sub,
  parentEnabled,
  pendingChanges,
  isUpdating,
  onToggle,
}: {
  sub: TenantSubModule
  parentEnabled: boolean
  pendingChanges: Record<string, boolean>
  isUpdating: boolean
  onToggle: (moduleId: string, currentEnabled: boolean) => void
}) {
  const isComingSoon = sub.release_status === 'coming_soon'
  const hasPendingChange = sub.id in pendingChanges
  const effectiveEnabled = isComingSoon
    ? false
    : hasPendingChange
      ? pendingChanges[sub.id]
      : sub.is_enabled

  return (
    <div
      className={`flex items-center justify-between py-1 ${
        hasPendingChange ? 'bg-muted/30 -mx-3 px-3 rounded' : ''
      } ${isComingSoon ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
        <CornerDownRight className="h-3 w-3 shrink-0" />
        <span className={!effectiveEnabled ? 'line-through opacity-60' : ''}>{sub.name}</span>
        {sub.release_status === 'beta' && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 text-blue-600 border-blue-300">
            Beta
          </Badge>
        )}
        {isComingSoon && (
          <Badge
            variant="outline"
            className="text-[10px] px-1 py-0 text-amber-600 border-amber-300"
          >
            Soon
          </Badge>
        )}
        {hasPendingChange && !isComingSoon && (
          <Badge
            variant="outline"
            className="text-[10px] px-1 py-0 text-orange-600 border-orange-300"
          >
            Modified
          </Badge>
        )}
      </div>
      <Switch
        checked={effectiveEnabled}
        onCheckedChange={() => onToggle(sub.id, effectiveEnabled)}
        disabled={!parentEnabled || isUpdating || isComingSoon}
        className="scale-75"
        aria-label={`Toggle ${sub.name}`}
      />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  variant = 'default',
}: {
  label: string
  value: number
  variant?: 'default' | 'success' | 'muted' | 'info'
}) {
  const colorClasses = {
    default: 'text-foreground',
    success: 'text-green-600',
    muted: 'text-muted-foreground',
    info: 'text-blue-600',
  }

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${colorClasses[variant]}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
