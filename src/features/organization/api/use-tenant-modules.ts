/**
 * Tenant Module Management API Hooks
 *
 * SWR hooks for per-tenant module enable/disable configuration
 */

import { useEffect } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import useSWRMutation from 'swr/mutation'
import { tenantEndpoints } from '@/lib/api/endpoints'
import { fetcher, fetcherWithOptions } from '@/lib/api/client'
import { getWebSocketClient } from '@/lib/websocket/client'

// ============================================
// TYPES
// ============================================

export interface TenantSubModule {
  id: string
  name: string
  description?: string
  icon?: string
  release_status: string
  is_enabled: boolean
}

export interface TenantModule {
  id: string
  name: string
  description?: string
  icon?: string
  category: string
  display_order: number
  is_core: boolean
  is_enabled: boolean
  release_status: string
  sub_modules?: TenantSubModule[]
}

export interface TenantModuleSummary {
  total: number
  enabled: number
  disabled: number
  core: number
}

export interface ModuleWarning {
  module_id: string
  name: string
  reason: string
}

export interface TenantModuleListResponse {
  modules: TenantModule[]
  summary: TenantModuleSummary
  // Populated only after a PATCH — the service reports any soft
  // dependencies that will degrade because of a toggle. The UI
  // surfaces them as sonner toasts so the admin is informed without
  // being blocked.
  warnings?: ModuleWarning[]
}

export interface ModuleToggle {
  module_id: string
  is_enabled: boolean
}

// -----------------------------------------------------------------------------
// DEPENDENCY GRAPH + DRY-RUN VALIDATION
// -----------------------------------------------------------------------------
//
// Backend ships two companion endpoints alongside the core CRUD:
//   - GET   /settings/modules/graph    — static dependency edge list
//   - POST  /settings/modules/validate — dry-run toggle check
//
// These power the dependency-aware toggle UX: dependency badges next
// to each module, and a confirmation modal listing blockers/warnings
// BEFORE the admin commits the PATCH.

export type DependencyType = 'hard' | 'soft'

export interface DependencyEdge {
  /** Module that depends on `to`. */
  from: string
  /** Module required by `from`. */
  to: string
  type: DependencyType
  reason: string
}

export interface DependencyGraphResponse {
  edges: DependencyEdge[]
}

export interface ToggleIssue {
  module_id: string
  name: string
  reason: string
}

export interface ValidationIssues {
  blockers?: ToggleIssue[]
  warnings?: ToggleIssue[]
  required?: ToggleIssue[]
}

/**
 * Structured body returned by PATCH /settings/modules when the dep
 * check rejects. The backend serialises via writeToggleErrorJSON;
 * the UI reads the fields to render a dependency-specific toast.
 */
export interface ModuleToggleError {
  code: 'module_dependency_violation'
  message: string
  module_id: string
  module_name: string
  action: 'enable' | 'disable'
  blockers?: ToggleIssue[]
  required?: ToggleIssue[]
}

// ============================================
// FETCH TENANT MODULES
// ============================================

export function useTenantModules(tenantIdOrSlug: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<TenantModuleListResponse>(
    tenantIdOrSlug ? tenantEndpoints.modules(tenantIdOrSlug) : null,
    fetcher,
    {
      // 5-min dedup — module state changes are low-frequency (admin
      // toggles). Staleness is bounded by:
      //   1) WebSocket "module.updated" event → manual mutate (<1s)
      //   2) revalidateOnFocus → refresh when admin returns to tab
      //   3) This 5-min ceiling
      dedupingInterval: 5 * 60 * 1000,
      revalidateOnFocus: true,
    }
  )

  return {
    data,
    modules: data?.modules ?? [],
    summary: data?.summary,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

// ============================================
// UPDATE TENANT MODULES
// ============================================

async function updateModules(url: string, { arg }: { arg: { modules: ModuleToggle[] } }) {
  return fetcherWithOptions<TenantModuleListResponse>(url, {
    method: 'PATCH',
    body: JSON.stringify(arg),
  })
}

export function useUpdateTenantModules(tenantIdOrSlug: string | undefined) {
  const { trigger, isMutating, error } = useSWRMutation(
    tenantIdOrSlug ? tenantEndpoints.modules(tenantIdOrSlug) : null,
    updateModules
  )

  return {
    updateModules: trigger,
    isUpdating: isMutating,
    error,
  }
}

// ============================================
// RESET TENANT MODULES
// ============================================

async function resetModules(url: string) {
  return fetcherWithOptions<TenantModuleListResponse>(url, {
    method: 'POST',
  })
}

export function useResetTenantModules(tenantIdOrSlug: string | undefined) {
  const { trigger, isMutating, error } = useSWRMutation(
    tenantIdOrSlug ? tenantEndpoints.modulesReset(tenantIdOrSlug) : null,
    resetModules
  )

  return {
    resetModules: trigger,
    isResetting: isMutating,
    error,
  }
}

// ============================================
// DEPENDENCY GRAPH (static, cached long)
// ============================================

/**
 * Fetches the platform-wide module dependency graph. The graph is
 * static (product spec, not tenant data) so we cache it aggressively;
 * it only changes when the backend deploys a new dep-graph version.
 */
export function useModuleDependencyGraph(tenantIdOrSlug: string | undefined) {
  const { data, error, isLoading } = useSWR<DependencyGraphResponse>(
    tenantIdOrSlug ? tenantEndpoints.modulesGraph(tenantIdOrSlug) : null,
    fetcher,
    {
      revalidateOnFocus: false,
      // 1 hour dedup — the graph is a compile-time constant on the
      // server, so refetching more often is waste.
      dedupingInterval: 60 * 60 * 1000,
    }
  )

  return {
    edges: data?.edges ?? [],
    isLoading,
    isError: !!error,
  }
}

// ============================================
// DRY-RUN VALIDATION (preview before commit)
// ============================================

async function validateModules(url: string, { arg }: { arg: { modules: ModuleToggle[] } }) {
  return fetcherWithOptions<ValidationIssues>(url, {
    method: 'POST',
    body: JSON.stringify(arg),
  })
}

/**
 * Returns a trigger that posts a proposed set of toggles to
 * /settings/modules/validate and resolves with the blockers +
 * warnings + required the backend would have enforced on a real
 * PATCH. No DB write.
 */
export function useValidateTenantModules(tenantIdOrSlug: string | undefined) {
  const { trigger, isMutating, error } = useSWRMutation(
    tenantIdOrSlug ? tenantEndpoints.modulesValidate(tenantIdOrSlug) : null,
    validateModules
  )

  return {
    validate: trigger,
    isValidating: isMutating,
    error,
  }
}

// ============================================
// MODULE PRESETS
// ============================================
//
// Curated bundles — shown on the Settings → Modules preset picker and
// during tenant onboarding. Source of truth is static Go at
// pkg/domain/module/presets.go; the UI fetches metadata and renders
// a card grid. Apply writes through UpdateTenantModules so dependency
// validation + audit logging run exactly as with manual toggles.

export interface ModulePreset {
  id: string
  name: string
  description: string
  target_persona: string
  icon: string
  key_outcomes: string[]
  recommended_for: string[]
  /** Total modules enabled after applying, incl. core + transitive deps. */
  module_count: number
}

export interface ModuleRef {
  module_id: string
  name: string
}

export interface PresetDiff {
  preset_id: string
  preset_name: string
  to_enable: ModuleRef[]
  to_disable: ModuleRef[]
  unchanged: number
  total_after: number
  audit_notice?: string
}

/**
 * Fetches the static preset catalogue. Aggressively cached — presets
 * are product spec shipped by the backend, they don't change per-user.
 */
export function useModulePresets(tenantIdOrSlug: string | undefined) {
  const { data, error, isLoading } = useSWR<{ presets: ModulePreset[] }>(
    tenantIdOrSlug ? tenantEndpoints.modulesPresets(tenantIdOrSlug) : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60 * 60 * 1000,
    }
  )
  return {
    presets: data?.presets ?? [],
    isLoading,
    isError: !!error,
  }
}

/**
 * Same as useModulePresets but hits the tenantless endpoint. Used by
 * the create-team form — the team doesn't exist yet so we can't use
 * the tenant-scoped variant. The payload is identical.
 */
export function useModulePresetsPublic() {
  const { data, error, isLoading } = useSWR<{ presets: ModulePreset[] }>(
    tenantEndpoints.modulesPresetsPublic(),
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60 * 60 * 1000,
    }
  )
  return {
    presets: data?.presets ?? [],
    isLoading,
    isError: !!error,
  }
}

async function previewPreset(url: string, _args: { arg: Record<string, never> }) {
  return fetcherWithOptions<PresetDiff>(url, { method: 'POST' })
}

async function applyPreset(url: string, _args: { arg: Record<string, never> }) {
  return fetcherWithOptions<TenantModuleListResponse>(url, { method: 'POST' })
}

/**
 * Returns a trigger that dry-runs a preset. Handy to show the admin
 * "if you apply this, X modules will switch off, Y will switch on"
 * before committing.
 */
export function usePreviewPreset(tenantIdOrSlug: string | undefined, presetId: string | undefined) {
  const url =
    tenantIdOrSlug && presetId
      ? tenantEndpoints.modulesPresetPreview(tenantIdOrSlug, presetId)
      : null
  const { trigger, isMutating, error } = useSWRMutation(url, previewPreset)
  return { preview: trigger, isPreviewing: isMutating, error }
}

/**
 * Returns a trigger that applies a preset to the tenant — writes the
 * resulting toggle set through the normal UpdateTenantModules pipeline
 * so dependency validation + audit logging run unchanged.
 */
export function useApplyPreset(tenantIdOrSlug: string | undefined, presetId: string | undefined) {
  const url =
    tenantIdOrSlug && presetId ? tenantEndpoints.modulesPresetApply(tenantIdOrSlug, presetId) : null
  const { trigger, isMutating, error } = useSWRMutation(url, applyPreset)
  return { apply: trigger, isApplying: isMutating, error }
}

// ============================================
// REAL-TIME MODULE INVALIDATION (WebSocket)
// ============================================
//
// Backend broadcasts a "module.updated" event on the tenant:{id}
// channel after every toggle / preset apply / reset (see
// ModuleService.notifyModuleChange). The hook below subscribes the
// page to that channel and force-refetches the module SWR keys when
// the event arrives — so an admin in tab A who toggles a module sees
// the change reflected in tab B (or another admin's session) within
// ~100ms instead of the 5-min SWR dedup ceiling.
//
// Falls back gracefully if the WS client isn't initialised (e.g.
// during onboarding before the tenant context is ready) — no error,
// just no realtime invalidation, and the 5-min dedup still bounds
// staleness.

interface ModuleUpdatedEvent {
  type: string
  tenant_id?: string
  version?: number
}

/**
 * Subscribes to tenant module-update events and invalidates the
 * module SWR caches (per-tenant + per-user) when one arrives. Returns
 * void; the effect's cleanup unsubscribes on unmount.
 */
export function useModuleRealtimeInvalidation(tenantIdOrSlug: string | undefined) {
  const { mutate } = useSWRConfig()

  useEffect(() => {
    if (!tenantIdOrSlug) return

    // getWebSocketClient() throws if not initialised by the
    // WebSocketProvider yet (race during initial mount, or routes that
    // don't mount the provider). Wrap in try/catch so the page never
    // crashes on first render — graceful degradation: no realtime
    // invalidation, falls back to 5-min SWR dedup.
    let wsClient
    try {
      wsClient = getWebSocketClient()
    } catch {
      return
    }
    if (!wsClient) return

    const channel = `tenant:${tenantIdOrSlug}`
    const handler = (event: ModuleUpdatedEvent) => {
      if (event?.type !== 'module.updated') return
      // Defensive: validate the event is for THIS tenant. Backend
      // currently scopes via channel name but tighter check here
      // protects against future routing bugs.
      if (event.tenant_id && event.tenant_id !== tenantIdOrSlug) return
      // Refetch both the per-tenant module config (Settings → Modules
      // page) and the per-user filtered module set (sidebar). They
      // share the same source of truth but are surfaced through
      // different SWR keys.
      void mutate(tenantEndpoints.modules(tenantIdOrSlug))
      void mutate('/api/v1/me/modules')
    }

    void wsClient.subscribe<ModuleUpdatedEvent>(channel, handler).catch(() => {
      // Swallow — page still works without realtime invalidation,
      // bounded by the 5-min dedup window.
    })

    return () => {
      try {
        void wsClient.unsubscribe(channel, handler).catch(() => {})
      } catch {
        // ignore — client may have been destroyed during unmount
      }
    }
  }, [tenantIdOrSlug, mutate])
}
