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
import { Lock, RotateCcw, ChevronDown, ChevronRight, CornerDownRight } from 'lucide-react'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'
import { getErrorMessage } from '@/lib/api/error-handler'
import {
  useTenantModules,
  useUpdateTenantModules,
  useResetTenantModules,
} from '@/features/organization/api/use-tenant-modules'
import type {
  TenantModule,
  TenantSubModule,
  ModuleToggle,
} from '@/features/organization/api/use-tenant-modules'

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

export default function ModuleManagementPage() {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.id

  const { modules, summary, isLoading, mutate } = useTenantModules(tenantId)
  const { updateModules, isUpdating } = useUpdateTenantModules(tenantId)
  const { resetModules, isResetting } = useResetTenantModules(tenantId)
  const { mutate: globalMutate } = useSWRConfig()

  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({})
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [coreExpanded, setCoreExpanded] = useState(false)

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

  const handleSave = useCallback(async () => {
    if (!isDirty) return

    const toggles: ModuleToggle[] = Object.entries(pendingChanges).map(([moduleId, isEnabled]) => ({
      module_id: moduleId,
      is_enabled: isEnabled,
    }))

    try {
      const result = await updateModules({ modules: toggles })
      if (result) {
        await mutate(result, false)
      }
      setPendingChanges({})
      // Invalidate sidebar module cache so changes reflect immediately
      await globalMutate('/api/v1/me/modules')
      toast.success('Modules updated successfully')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [isDirty, pendingChanges, updateModules, mutate, globalMutate])

  const handleDiscard = useCallback(() => {
    setPendingChanges({})
  }, [])

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
}: {
  mod: TenantModule
  isEnabled: boolean
  hasPendingChange: boolean
  pendingChanges: Record<string, boolean>
  isUpdating: boolean
  onToggle: (moduleId: string, currentEnabled: boolean) => void
}) {
  const hasSubModules = mod.sub_modules && mod.sub_modules.length > 0
  const categoryLabel = CATEGORY_LABELS[mod.category] || mod.category

  // Filter out deprecated sub-modules; keep coming_soon (shown as disabled)
  const visibleSubModules = hasSubModules
    ? mod.sub_modules!.filter((sub) => sub.release_status !== 'deprecated')
    : []

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
