/**
 * useSettingsNav hides what the user cannot open, with the main sidebar's
 * rules: permission, tenant module (fail-open when the API sends no module
 * list), and integration sub-modules.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const state = {
  perms: new Set<string>(),
  moduleIds: [] as string[],
  subModules: {} as Record<string, { slug: string; release_status?: string }[]>,
}

vi.mock('@/lib/permissions/hooks', () => ({
  usePermissions: () => ({
    can: (p: string) => state.perms.has(p),
    canAny: (...ps: string[]) => ps.some((p) => state.perms.has(p)),
    isRole: () => false,
    isAnyRole: () => false,
    tenantRole: 'member',
  }),
}))
vi.mock('@/context/bootstrap-provider', () => ({
  useBootstrapModules: () => ({ moduleIds: state.moduleIds, modules: [] }),
}))
vi.mock('@/features/integrations/api/use-tenant-modules', () => ({
  useTenantModules: () => ({ subModules: state.subModules }),
}))
vi.mock('@/context/i18n-provider', () => ({
  useTranslation: () => ({ t: (_k: string, fallback: string) => fallback }),
}))

import { useSettingsNav } from '../use-settings-nav'
import { Permission } from '@/lib/permissions'

const ids = () =>
  renderHook(() => useSettingsNav()).result.current.flatMap((g) => g.items.map((i) => i.id))
const groupIds = () => renderHook(() => useSettingsNav()).result.current.map((g) => g.id)

beforeEach(() => {
  state.perms = new Set()
  state.moduleIds = []
  state.subModules = {}
})

describe('useSettingsNav', () => {
  it('a user with no permissions sees only My account', () => {
    expect(groupIds()).toEqual(['account'])
    expect(ids()).toEqual([
      'profile',
      'account-security',
      'preferences',
      'my-notifications',
      'activity',
    ])
  })

  it('shows an item only with the permission its route needs', () => {
    state.perms = new Set([Permission.AuditRead, Permission.MembersRead])
    expect(ids()).toContain('audit-log')
    expect(ids()).toContain('members')
    expect(ids()).not.toContain('org-general')
    expect(ids()).not.toContain('roles')
  })

  it('hides items of a disabled module, keeps the rest (Modules page stays)', () => {
    state.perms = new Set([Permission.TeamUpdate, Permission.SLARead, Permission.IntegrationsRead])
    state.moduleIds = ['sla'] // integrations and risk_scoring are off
    const visible = ids()
    expect(visible).toContain('sla-policies')
    expect(visible).toContain('modules')
    expect(visible).not.toContain('risk-scoring')
    expect(visible.filter((i) => ['all-integrations', 'siem', 'api-keys'].includes(i))).toEqual([])
  })

  it('OSS edition (no module list) shows every permitted item', () => {
    state.perms = new Set([Permission.IntegrationsRead, Permission.TeamUpdate])
    expect(ids()).toContain('risk-scoring')
    expect(ids()).toContain('siem')
  })

  it('hides an integration whose sub-module is off', () => {
    state.perms = new Set([Permission.IntegrationsRead])
    state.subModules = {
      integrations: [{ slug: 'scm' }, { slug: 'siem', release_status: 'disabled' }],
    }
    const visible = ids()
    expect(visible).toContain('source-control')
    expect(visible).toContain('all-integrations') // no sub-module key
    expect(visible).not.toContain('siem') // disabled
    expect(visible).not.toContain('ticketing') // absent
  })
})
