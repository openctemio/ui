'use client'

import { useMemo } from 'react'
import { useTranslation } from '@/context/i18n-provider'
import { useTenantModules } from '@/features/integrations/api/use-tenant-modules'
import { useNavItemAccess, subModuleStatus } from '@/lib/permissions'
import { settingsNav, type SettingsNavGroup, type SettingsNavItem } from '@/config/settings-nav'

export interface VisibleSettingsItem extends SettingsNavItem {
  /** Translated title. */
  label: string
  /** Translated description. */
  desc: string
  /** Translated group title. */
  groupLabel: string
}

export interface VisibleSettingsGroup extends Omit<SettingsNavGroup, 'items'> {
  label: string
  items: VisibleSettingsItem[]
}

/**
 * The settings groups and items the current user may open, translated.
 *
 * An item is hidden when the user lacks its permission, or its module (or
 * integration sub-module) is off for the tenant: the same decision the main
 * sidebar makes (useNavItemAccess, subModuleStatus). A group with no visible
 * item is dropped. "My account" items carry no permission, so every signed-in
 * user sees at least that group.
 */
export function useSettingsNav(): VisibleSettingsGroup[] {
  const canSee = useNavItemAccess()
  const { subModules } = useTenantModules()
  const { t } = useTranslation()

  return useMemo(
    () =>
      settingsNav
        .map((group) => {
          const label = t(`settings.group.${group.id}`, group.title)
          const items = group.items
            .filter(
              (item) =>
                canSee(item) &&
                subModuleStatus(item.module, item.subModuleKey, subModules) !== false
            )
            .map((item) => ({
              ...item,
              label: t(`settings.item.${item.id}`, item.title),
              desc: t(`settings.desc.${item.id}`, item.description),
              groupLabel: label,
            }))
          return { ...group, label, items }
        })
        .filter((group) => group.items.length > 0),
    [canSee, subModules, t]
  )
}
