'use client'

import { Main } from '@/components/layout'
import { LinkCard, PageHeader, SettingsSection } from '@/features/shared'
import { useTranslation } from '@/context/i18n-provider'
import { useSettingsNav } from '@/hooks/use-settings-nav'

/**
 * /settings: every settings page the user can open, grouped as in the settings
 * rail and built from the same config (src/config/settings-nav.ts), so this
 * page, the rail and ⌘K never disagree. Everyone sees at least "My account",
 * so the user-menu "Settings" link never ends on Access Denied.
 */
export default function SettingsIndexPage() {
  const { t } = useTranslation()
  const groups = useSettingsNav()

  return (
    <Main>
      <PageHeader
        title={t('nav.item.settings', 'Settings')}
        description={t(
          'settings.overview.description',
          'Your account, and how your organization is set up.'
        )}
      />
      <div className="mt-5 space-y-8">
        {groups.map((group) => (
          <SettingsSection key={group.id} id={`settings-${group.id}`} title={group.label}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <LinkCard
                  key={item.id}
                  href={item.url}
                  icon={item.icon}
                  title={item.label}
                  description={item.desc}
                  badge={item.badge ? t('settings.badge.soon', 'Soon') : undefined}
                />
              ))}
            </div>
          </SettingsSection>
        ))}
      </div>
    </Main>
  )
}
