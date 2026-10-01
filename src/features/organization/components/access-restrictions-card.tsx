'use client'

import { AlertCircle, Info, Plus } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { ApiClientError } from '@/lib/api/error-handler'

/** "a\n b \n\nc" -> ["a", "b", "c"] */
export function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * The API refuses an IP allowlist that would lock the caller out:
 * 400 "IP allowlist must include your current IP address (<ip>)".
 */
export function isIpLockoutError(err: unknown): err is ApiClientError {
  return (
    err instanceof ApiClientError &&
    err.statusCode === 400 &&
    /ip allowlist must include your current ip/i.test(err.message)
  )
}

interface AccessRestrictionsCardProps {
  /** One entry per line. */
  ipAllowlist: string
  allowedDomains: string
  onIpAllowlistChange: (value: string) => void
  onAllowedDomainsChange: (value: string) => void
  /** The caller's IP as the API sees it (GET /settings → security.current_ip). */
  currentIp?: string
  /** Inline error for the IP allowlist (e.g. the lockout refusal). */
  ipAllowlistError?: string | null
  disabled?: boolean
}

/**
 * Organization-level access restrictions the API enforces: which email domains
 * may hold accounts, and which networks users may reach the organization from.
 */
export function AccessRestrictionsCard({
  ipAllowlist,
  allowedDomains,
  onIpAllowlistChange,
  onAllowedDomainsChange,
  currentIp,
  ipAllowlistError,
  disabled,
}: AccessRestrictionsCardProps) {
  const ipEntries = parseLines(ipAllowlist)
  const domainEntries = parseLines(allowedDomains)
  const currentIpListed = !!currentIp && ipEntries.includes(currentIp)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access restrictions</CardTitle>
        <CardDescription>
          Enforced for user accounts in this organization. Sensors (agents), API keys and the
          platform admin console are not affected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="allowed-domains">Allowed email domains</Label>
          <Textarea
            id="allowed-domains"
            placeholder={'One domain per line\nExample: example.com'}
            value={allowedDomains}
            onChange={(e) => onAllowedDomainsChange(e.target.value)}
            rows={3}
            disabled={disabled}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            When set, only people whose email is at one of these domains can be invited, added by an
            administrator, or join through single sign-on. Existing members are not removed.{' '}
            {domainEntries.length === 0 && (
              <span className="font-medium text-foreground">
                Empty: any email domain is allowed.
              </span>
            )}
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="ip-whitelist">IP allowlist</Label>
          <Textarea
            id="ip-whitelist"
            placeholder={'IP addresses or CIDR ranges, one per line\nExample: 192.168.1.0/24'}
            value={ipAllowlist}
            onChange={(e) => onIpAllowlistChange(e.target.value)}
            rows={4}
            disabled={disabled}
            className="font-mono text-sm"
            aria-invalid={!!ipAllowlistError}
            aria-describedby="ip-whitelist-help"
          />
          <div id="ip-whitelist-help" className="space-y-1 text-xs text-muted-foreground">
            <p>
              When set, users can only use this organization from these addresses; requests from
              anywhere else are refused. The check uses the IP address the server sees — behind a
              VPN, proxy or NAT that is the address of that gateway, not your device.
            </p>
            {ipEntries.length === 0 && (
              <p className="font-medium text-foreground">Empty: no IP restriction.</p>
            )}
          </div>

          {currentIp && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Your current IP:</span>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{currentIp}</code>
              {!currentIpListed && !disabled && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() =>
                    onIpAllowlistChange(
                      ipAllowlist.trim() ? `${ipAllowlist.trimEnd()}\n${currentIp}` : currentIp
                    )
                  }
                >
                  <Plus className="me-1 h-3 w-3" />
                  Add my IP
                </Button>
              )}
            </div>
          )}

          {ipAllowlistError && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p>{ipAllowlistError}</p>
                <p>
                  Saving it would lock you out. Include your current IP (or a range containing it),
                  or leave the list empty.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
