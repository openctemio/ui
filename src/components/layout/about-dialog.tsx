'use client'

import { ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTranslation } from '@/context/i18n-provider'
import { DOCS_URL } from '@/config/help-links'
import { getAppVersion } from '@/lib/app-version'

interface AboutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Help > About OpenCTEM: the web app's release version and commit.
 *
 * The API exposes no version (its /health and /ready carry status only), so
 * there is no API row; add one when it does rather than guessing it here.
 */
export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const { t } = useTranslation()
  const { version, commit } = getAppVersion()

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
          <div className="flex items-center justify-between gap-4 px-3 py-2">
            <dt className="text-muted-foreground">
              {t('help.about.uiVersion', 'Web app version')}
            </dt>
            <dd className="font-medium tabular-nums" data-testid="about-ui-version">
              {version ?? t('help.about.devBuild', 'Development build')}
            </dd>
          </div>
          {commit && (
            <div className="flex items-center justify-between gap-4 px-3 py-2">
              <dt className="text-muted-foreground">{t('help.about.commit', 'Commit')}</dt>
              <dd className="font-mono text-xs">{commit}</dd>
            </div>
          )}
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
