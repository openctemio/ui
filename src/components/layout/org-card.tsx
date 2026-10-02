'use client'

/**
 * The organization card: what opens from the sidebar's context row.
 *
 * It always opens, even with one organization and no way to create another,
 * because it is where a member finds the organization's plan, their role in
 * it, how many members it has and its ID. Top to bottom: the organization,
 * its details (role, members, ID), the API keys link, the other organizations
 * (only with more than one), "Create organization" (only when the server
 * allows self-service creation) and who is signed in.
 *
 * Never shows an API key: `oct_` keys are per user, hashed and shown once, so
 * the card only links to the API keys page.
 */

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Copy, Loader2, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/context/i18n-provider'
import { copyToClipboard } from '@/lib/clipboard'
import { cn } from '@/lib/utils'

export interface OrgCardOrganization {
  id: string
  name: string
  role?: string
}

export interface OrgCardLink {
  label: string
  url: string
}

export interface OrgCardProps {
  current: { id: string; name: string; plan?: string; role?: string }
  /** Every organization the user belongs to, the current one included. */
  organizations: OrgCardOrganization[]
  /** Members settings page, when the user may open it (and so read the count). */
  membersLink?: OrgCardLink
  memberCount?: number
  memberCountLoading?: boolean
  /** API keys settings page, when the user may open it. */
  apiKeysLink?: OrgCardLink
  canCreate: boolean
  email?: string
  /** A switch is in progress (or the app is still bootstrapping). */
  isSwitching: boolean
  onSwitch: (organizationId: string) => void
  onCreate: () => void
  /** Called when a link inside the card is followed. */
  onNavigate: () => void
}

/** Up to two initials, e.g. "ORG tenant" -> "OT", "acme" -> "AC". */
export function orgInitials(name: string): string {
  const words = name
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value
}

/** Translated role / plan names, falling back to the raw value capitalized. */
export function useOrgLabels() {
  const { t } = useTranslation()
  return React.useMemo(
    () => ({
      role: (role?: string) => (role ? t(`org.role.${role}`, capitalize(role)) : ''),
      plan: (plan?: string) => (plan ? t(`org.plan.${plan}`, capitalize(plan)) : ''),
    }),
    [t]
  )
}

/**
 * Initials on a neutral tile, so each organization is recognisable in the
 * list (a decorative icon cycled by index told the user nothing).
 */
function OrgAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md bg-muted font-semibold text-foreground ring-1 ring-border',
        size === 'md' ? 'size-9 text-xs' : 'size-6 text-[10px]'
      )}
    >
      {orgInitials(name)}
    </span>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-3 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-end">{children}</dd>
    </div>
  )
}

function CopyIdButton({ value }: { value: string }) {
  const { t } = useTranslation()
  const [state, setState] = React.useState<'idle' | 'copied' | 'failed'>('idle')

  React.useEffect(() => {
    if (state === 'idle') return
    const timer = window.setTimeout(() => setState('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [state])

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 gap-1.5 px-2 text-xs"
        aria-label={t('org.copyId', 'Copy organization ID')}
        onClick={async () => setState((await copyToClipboard(value)) ? 'copied' : 'failed')}
      >
        {state === 'copied' ? (
          <Check className="size-3.5 text-success" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
        <span aria-hidden>{state === 'copied' ? t('org.copied', 'Copied') : null}</span>
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {state === 'copied'
          ? t('org.copied', 'Copied')
          : state === 'failed'
            ? t('org.copyFailed', 'Could not copy the organization ID')
            : ''}
      </span>
    </>
  )
}

/** Arrow keys move between the organizations; Enter or Space switches. */
function focusSibling(event: React.KeyboardEvent<HTMLUListElement>) {
  const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
  if (!keys.includes(event.key)) return
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'))
  if (buttons.length === 0) return
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
  let next = index
  if (event.key === 'ArrowDown') next = index < 0 ? 0 : (index + 1) % buttons.length
  if (event.key === 'ArrowUp') next = index <= 0 ? buttons.length - 1 : index - 1
  if (event.key === 'Home') next = 0
  if (event.key === 'End') next = buttons.length - 1
  event.preventDefault()
  buttons[next]?.focus()
}

const ROW_LINK_CLASS =
  'flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'

export function OrgCard({
  current,
  organizations,
  membersLink,
  memberCount,
  memberCountLoading,
  apiKeysLink,
  canCreate,
  email,
  isSwitching,
  onSwitch,
  onCreate,
  onNavigate,
}: OrgCardProps) {
  const { t } = useTranslation()
  const labels = useOrgLabels()
  const others = organizations.length > 1
  const plan = labels.plan(current.plan)
  const role = labels.role(current.role)

  const memberCountText =
    memberCount === undefined
      ? ''
      : memberCount === 1
        ? t('org.memberCount.one', '1 member')
        : t('org.memberCount.other', '{count} members', { count: memberCount })

  return (
    <div className="flex flex-col" data-testid="org-card">
      {/* 1. The organization */}
      <div className="flex items-center gap-3 p-3">
        <OrgAvatar name={current.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" title={current.name}>
            {current.name}
          </p>
          {plan && (
            <Badge variant="secondary" className="mt-1" data-testid="org-card-plan">
              <span className="sr-only">{t('org.planLabel', 'Plan')}: </span>
              {plan}
            </Badge>
          )}
        </div>
      </div>

      <dl className="space-y-0.5 px-3 pb-3">
        {role && <DetailRow label={t('org.role', 'Your role')}>{role}</DetailRow>}
        {membersLink && (
          <DetailRow label={membersLink.label}>
            {memberCountLoading ? (
              <Skeleton className="ms-auto h-4 w-20" />
            ) : memberCount !== undefined ? (
              <Link
                href={membersLink.url}
                prefetch={false}
                onClick={onNavigate}
                className="tabular-nums underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-hidden"
                data-testid="org-card-members"
              >
                {memberCountText}
              </Link>
            ) : null}
          </DetailRow>
        )}
        {/* 2. Organization ID: the label row carries the copy button, the
            full value gets its own line in the foreground colour (mono as an
            identifier, style contract section 5). */}
        <div className="pt-1">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-muted-foreground">{t('org.id', 'Organization ID')}</dt>
            <CopyIdButton value={current.id} />
          </div>
          <dd
            className="font-mono text-xs break-all text-foreground select-all"
            data-testid="org-card-id"
          >
            {current.id}
          </dd>
        </div>
      </dl>

      {/* 3. API keys: a link to the page, never a key. */}
      {apiKeysLink && (
        <>
          <Separator />
          <div className="p-1">
            <Link
              href={apiKeysLink.url}
              prefetch={false}
              onClick={onNavigate}
              className={ROW_LINK_CLASS}
              data-testid="org-card-api-keys"
            >
              <span className="flex-1">{apiKeysLink.label}</span>
              <ArrowRight className="size-4 text-muted-foreground rtl:rotate-180" aria-hidden />
            </Link>
          </div>
        </>
      )}

      {/* 4. Other organizations */}
      {others && (
        <>
          <Separator />
          <div className="p-1">
            <p id="org-card-switch" className="px-2 pt-1.5 pb-1 text-xs text-muted-foreground">
              {t('org.switch', 'Switch organization')}
            </p>
            <ul aria-labelledby="org-card-switch" onKeyDown={focusSibling}>
              {organizations.map((org) => {
                const active = org.id === current.id
                return (
                  <li key={org.id}>
                    <button
                      type="button"
                      className={cn(ROW_LINK_CLASS, 'h-9', active && 'bg-accent/60')}
                      aria-current={active ? 'true' : undefined}
                      disabled={isSwitching}
                      onClick={() => (active ? undefined : onSwitch(org.id))}
                      data-testid="org-card-switch-item"
                    >
                      <OrgAvatar name={org.name} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-start">{org.name}</span>
                      {org.role && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {labels.role(org.role)}
                        </span>
                      )}
                      <span className="flex size-4 shrink-0 items-center justify-center">
                        {active &&
                          (isSwitching ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                          ) : (
                            <Check className="size-4 text-primary" aria-hidden />
                          ))}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}

      {/* 5. Create organization: only when the server allows it. */}
      {canCreate && (
        <>
          <Separator />
          <div className="p-1">
            <button type="button" className={ROW_LINK_CLASS} onClick={onCreate}>
              <Plus className="size-4 text-muted-foreground" aria-hidden />
              <span className="flex-1 text-start">{t('org.create', 'Create organization')}</span>
            </button>
          </div>
        </>
      )}

      {/* 6. Who is signed in */}
      {email && (
        <>
          <Separator />
          <p className="truncate px-3 py-2.5 text-xs text-muted-foreground" title={email}>
            {t('org.signedInAs', 'Signed in as')}{' '}
            <span className="text-foreground" data-testid="org-card-email">
              {email}
            </span>
          </p>
        </>
      )}
    </div>
  )
}
