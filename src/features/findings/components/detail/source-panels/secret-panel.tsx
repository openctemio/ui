'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Key, ShieldAlert, ShieldCheck, Clock, GitCommit } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FindingDetail } from '../../../types'

interface SecretPanelProps {
  finding: FindingDetail
}

export function SecretPanel({ finding }: SecretPanelProps) {
  const details = finding.secretDetails

  if (!details) return null

  const isActive = details.valid === true && details.revoked !== true
  const isRevoked = details.revoked === true
  const statusColor = isRevoked ? 'text-green-400' : isActive ? 'text-red-400' : 'text-yellow-400'
  const statusLabel = isRevoked ? 'Revoked' : isActive ? 'Active' : 'Unknown'
  const statusBg = isRevoked ? 'bg-green-500/20' : isActive ? 'bg-red-500/20' : 'bg-yellow-500/20'

  // Calculate rotation info
  const rotationDueDate = details.rotationDueAt ? new Date(details.rotationDueAt) : null
  const rotationOverdue = rotationDueDate ? rotationDueDate.getTime() < new Date().getTime() : false
  const rotationDays = rotationDueDate
    ? Math.ceil((rotationDueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Card className="mx-6 mt-3 border-amber-500/30 bg-amber-500/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Key className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-400">Secret Detection</span>
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {details.secretType && (
            <div>
              <div className="text-xs text-muted-foreground">Type</div>
              <div className="text-sm font-medium capitalize">
                {details.secretType.replace(/_/g, ' ')}
              </div>
            </div>
          )}
          {details.service && (
            <div>
              <div className="text-xs text-muted-foreground">Service</div>
              <div className="text-sm font-medium capitalize">{details.service}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-muted-foreground">Status</div>
            <Badge variant="outline" className={cn('text-xs', statusColor, statusBg)}>
              {statusLabel}
            </Badge>
          </div>
          {details.ageInDays != null && (
            <div>
              <div className="text-xs text-muted-foreground">Age</div>
              <div className="text-sm font-medium">{details.ageInDays}d</div>
            </div>
          )}
        </div>

        {/* Masked value */}
        {details.maskedValue && (
          <div className="mb-3">
            <div className="text-xs text-muted-foreground mb-1">Value</div>
            <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
              {details.maskedValue}
            </code>
          </div>
        )}

        {/* Scopes */}
        {details.scopes && details.scopes.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-muted-foreground mb-1">Scopes</div>
            <div className="flex flex-wrap gap-1">
              {details.scopes.map((scope) => (
                <Badge key={scope} variant="outline" className="text-xs">
                  {scope}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Entropy */}
        {details.entropy != null && (
          <div className="mb-3">
            <div className="text-xs text-muted-foreground">
              Entropy: {details.entropy.toFixed(2)}
            </div>
          </div>
        )}

        <Separator className="my-2" />

        {/* Footer info */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {details.rotationDueAt && (
            <div className={cn('flex items-center gap-1', rotationOverdue && 'text-red-400')}>
              <Clock className="h-3 w-3" />
              Rotation {rotationOverdue ? 'overdue' : `in ${rotationDays}d`}
            </div>
          )}
          {details.commitCount != null && details.commitCount > 0 && (
            <div className="flex items-center gap-1">
              <GitCommit className="h-3 w-3" />
              Found in {details.commitCount} commit{details.commitCount > 1 ? 's' : ''}
            </div>
          )}
          {details.inHistoryOnly && <div className="flex items-center gap-1">History only</div>}
        </div>

        {/* Warning for active secrets */}
        {isActive && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {isRevoked ? (
              <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
            )}
            <span>
              This secret is VALID and has not been revoked. Immediate rotation is recommended.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
