'use client'

import { ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/context/i18n-provider'
import { DOCS_URL } from '@/config/help-links'
import type { ShortcutShell } from '@/config/keyboard-shortcuts'
import { useBuildVersions } from '@/hooks/use-build-versions'
import { UNKNOWN_COMMIT, type BuildInfo } from '@/lib/app-version'

interface AboutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Which shell: the admin console reads the API version with its own session. */
  shell?: ShortcutShell
}

/**
 * Help > About OpenCTEM: the web app's and the API's build. Shared by the app
 * and the admin console (via SidebarFooterLinks).
 *
 * Release builds show their tag; development deployments show
 * "<highest tag>-dev" and the commit, read from the checkout. A row that cannot
 * be determined says "unavailable" and the dialog still renders.
 */
export function AboutDialog({ open, onOpenChange, shell = 'app' }: AboutDialogProps) {
  const { t } = useTranslation()
  const { web, api } = useBuildVersions(shell, open)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('help.about', 'About OpenCTEM')}</DialogTitle>
          <DialogDescription>
            {t('help.about.description', 'Continuous threat exposure management platform.')}
          </DialogDescription>
        </DialogHeader>
        <dl className="divide-y rounded-md border text-sm">
          <VersionRow
            label={t('help.about.webApp', 'Web app')}
            info={web}
            testId="about-ui-version"
          />
          <VersionRow label={t('help.about.api', 'API')} info={api} testId="about-api-version" />
        </dl>
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
        >
          {t('help.documentation', 'Documentation')}
          <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only">{t('help.opensInNewTab', '(opens in a new tab)')}</span>
        </a>
      </DialogContent>
    </Dialog>
  )
}

function VersionRow({
  label,
  info,
  testId,
}: {
  label: string
  info: BuildInfo | null | undefined
  testId: string
}) {
  const { t } = useTranslation()

  let value
  if (info === undefined) {
    value = (
      <Skeleton className="h-4 w-28" aria-label={t('help.about.loading', 'Loading version')} />
    )
  } else if (info === null) {
    value = (
      <span className="text-muted-foreground">{t('help.about.unavailable', 'unavailable')}</span>
    )
  } else {
    value = (
      <span className="flex flex-col items-end gap-0.5">
        <span className="font-medium tabular-nums">
          {info.version}
          {info.commit !== UNKNOWN_COMMIT && (
            <span className="ms-1.5 font-mono text-xs font-normal text-muted-foreground">
              ({info.commit})
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground" data-testid={`${testId}-channel`}>
          {info.channel === 'release'
            ? t('help.about.release', 'Release')
            : t('help.about.devBuild', 'Development build')}
        </span>
      </span>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end" data-testid={testId}>
        {value}
      </dd>
    </div>
  )
}
