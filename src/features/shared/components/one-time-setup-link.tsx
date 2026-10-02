'use client'

import { useState } from 'react'
import { Check, Copy, MailCheck, ShieldAlert } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { copyToClipboard } from '@/lib/clipboard'
import { cn } from '@/lib/utils'

/**
 * What the API returns after creating an account for someone (or re-issuing
 * their setup link): either it emailed them, or it hands back a one-time token
 * that only this screen ever shows.
 */
export interface SetupLinkOutcome {
  email_sent: boolean
  /**
   * The organization can send email but the send failed, and the link was
   * deliberately not returned (the platform console's first-owner bootstrap).
   * The person uses "Forgot password" on the sign-in page.
   */
  email_failed?: boolean
  setup_token?: string
  /** RFC3339 */
  setup_expires_at?: string
}

/** `${origin}/set-password?token=...` — the page the user opens to choose a password. */
export function buildSetupLink(token: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/set-password?token=${encodeURIComponent(token)}`
}

function formatExpiry(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface OneTimeSetupLinkProps {
  token: string
  expiresAt?: string
  /** Who the link is for (shown in the hand-over note). */
  email?: string
}

/**
 * Shows a one-time password-setup link with a copy button. The token is never
 * stored: once this view is closed it cannot be shown again (a new link has to
 * be issued, which invalidates this one).
 */
export function OneTimeSetupLink({ token, expiresAt, email }: OneTimeSetupLinkProps) {
  const [copied, setCopied] = useState(false)
  const link = buildSetupLink(token)
  const expiry = formatExpiry(expiresAt)

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-sm font-medium">One-time setup link</p>
        <div className="flex min-w-0 items-center gap-2">
          <code
            className="min-w-0 flex-1 rounded bg-muted px-2 py-1.5 font-mono text-xs break-all select-all"
            data-testid="setup-link"
          >
            {link}
          </code>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Copy setup link"
            onClick={async () => {
              if (await copyToClipboard(link)) setCopied(true)
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
      </div>
      <Alert className="border-warning/40 bg-warning/10">
        <ShieldAlert className="size-4 text-warning" />
        <AlertTitle>Shown once</AlertTitle>
        <AlertDescription>
          <p>
            Give this link to {email ? <strong>{email}</strong> : 'the user'} over a trusted channel
            (in person, or a chat you know is theirs). Anyone who opens it can set the
            account&apos;s password.
          </p>
          <p>
            {expiry ? `It works once and expires ${expiry}.` : 'It works once and expires.'} It will
            not be shown again; issue a new link if it is lost.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}

/**
 * The result of creating a user / issuing a setup link: "we emailed them", or
 * the one-time link when no email could be sent.
 */
export function SetupLinkResult({ outcome, email }: { outcome: SetupLinkOutcome; email: string }) {
  if (outcome.setup_token) {
    return (
      <OneTimeSetupLink
        token={outcome.setup_token}
        expiresAt={outcome.setup_expires_at}
        email={email}
      />
    )
  }
  if (outcome.email_failed) {
    return (
      <Alert variant="destructive">
        <MailCheck className="size-4" />
        <AlertTitle>Setup email not sent</AlertTitle>
        <AlertDescription>
          {`The account for ${email} was created, but the email with its setup link could not be sent. For security the link is not shown here. Once email works, ${email} can use "Forgot password" on the sign-in page to set a password.`}
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <Alert>
      <MailCheck className="size-4" />
      <AlertTitle>{outcome.email_sent ? 'Setup email sent' : 'No setup link'}</AlertTitle>
      <AlertDescription>
        {outcome.email_sent
          ? `${email} has been emailed a link to set their password.`
          : `No email was sent and no setup link was returned. Issue a setup link for ${email} from the user list.`}
      </AlertDescription>
    </Alert>
  )
}

/** "Pending setup": the account was created by an admin and has no password yet. */
export function PendingSetupBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('border-warning/40 bg-warning/15 text-warning', className)}
      title="Account created by an administrator; the user has not set a password yet"
    >
      Pending setup
    </Badge>
  )
}
