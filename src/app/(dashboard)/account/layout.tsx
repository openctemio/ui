'use client'

import { usePathname } from 'next/navigation'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { useTranslation } from '@/context/i18n-provider'
import { activeSettingsItem } from '@/config/settings-nav'

/**
 * Personal settings (/account/*). The settings rail ("My account" group) is
 * the navigation, so there are no tabs here; the header is the current item's
 * title and description from src/config/settings-nav.ts, the same words the
 * rail and the /settings overview use.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t } = useTranslation()
  const item = activeSettingsItem(pathname)

  return (
    <Main>
      <PageHeader
        title={
          item
            ? t(`settings.item.${item.id}`, item.title)
            : t('settings.group.account', 'My account')
        }
        description={item ? t(`settings.desc.${item.id}`, item.description) : undefined}
      />
      <div className="mt-5">{children}</div>
    </Main>
  )
}
