/**
 * Asset Detail Sheet - Helper Section Components
 *
 * Reusable UI sections for asset detail sheets
 */

import * as React from 'react'
import {
  CheckCircle,
  Clock,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Key,
  AlertTriangle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import type { AssetType } from '../types/asset.types'
import { ASSET_TYPE_LABELS } from '../types/asset.types'

// ============================================
// Stat Card
// ============================================

interface StatCardProps {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  value: string | number
  label: string
  className?: string
}

export function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  className,
}: StatCardProps) {
  return (
    <div className={cn('rounded-xl border p-4 bg-card', className)}>
      <div className="flex items-center gap-3">
        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}

// Centered variant for website-style stats
export function StatCardCentered({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  className,
}: StatCardProps) {
  return (
    <div className={cn('rounded-xl border p-4 bg-card', className)}>
      <div className="flex flex-col items-center text-center">
        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center mb-2', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

// ============================================
// Stats Grid
// ============================================

interface StatsGridProps {
  children: React.ReactNode
  columns?: 2 | 3
  className?: string
}

export function StatsGrid({ children, columns = 2, className }: StatsGridProps) {
  return (
    <div
      className={cn(
        'grid gap-3',
        columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-3',
        className
      )}
    >
      {children}
    </div>
  )
}

// ============================================
// Timeline Section
// ============================================

interface TimelineSectionProps {
  firstSeen: string
  lastSeen: string
}

export function TimelineSection({ firstSeen, lastSeen }: TimelineSectionProps) {
  return (
    <div className="rounded-xl border p-4 bg-card">
      <h4 className="text-sm font-medium mb-3">Timeline</h4>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium">First Seen</p>
            <p className="text-xs text-muted-foreground">{new Date(firstSeen).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Last Seen</p>
            <p className="text-xs text-muted-foreground">{new Date(lastSeen).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Technical Details Section
// ============================================

interface TechnicalDetailsSectionProps {
  id: string
  type: AssetType
  groupId?: string // Optional - asset can be ungrouped
}

export function TechnicalDetailsSection({ id, type, groupId }: TechnicalDetailsSectionProps) {
  return (
    <div className="rounded-xl border p-4 bg-card">
      <h4 className="text-sm font-medium mb-3">Technical Details</h4>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">ID</span>
          <code className="text-xs bg-muted px-2 py-1 rounded">{id}</code>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Type</span>
          <span className="font-medium">{ASSET_TYPE_LABELS[type]}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Group</span>
          {groupId ? (
            <code className="text-xs bg-muted px-2 py-1 rounded">{groupId}</code>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Ungrouped
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Danger Zone Section
// ============================================

interface DangerZoneSectionProps {
  onDelete: () => void
  assetTypeName: string
}

export function DangerZoneSection({ onDelete, assetTypeName }: DangerZoneSectionProps) {
  return (
    <div className="rounded-xl border border-red-500/30 p-4 bg-red-500/5">
      <h4 className="text-sm font-medium text-red-500 mb-2">Danger Zone</h4>
      <p className="text-xs text-muted-foreground mb-3">
        Permanently delete this {assetTypeName.toLowerCase()} from your inventory.
      </p>
      <Button variant="destructive" size="sm" className="w-full" onClick={onDelete}>
        <Trash2 className="mr-2 h-4 w-4" />
        Delete {assetTypeName}
      </Button>
    </div>
  )
}

// ============================================
// Metadata Grid
// ============================================

interface MetadataGridProps {
  children: React.ReactNode
  columns?: 1 | 2
  className?: string
}

export function MetadataGrid({ children, columns = 2, className }: MetadataGridProps) {
  return (
    <div className={cn('rounded-xl border p-4 bg-card', className)}>
      <div
        className={cn(
          'grid gap-4 text-sm',
          columns === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
        )}
      >
        {children}
      </div>
    </div>
  )
}

// ============================================
// Metadata Row
// ============================================

interface MetadataRowProps {
  label: string
  value?: string | number | null
  children?: React.ReactNode
  colSpan?: 1 | 2
}

export function MetadataRow({ label, value, children, colSpan }: MetadataRowProps) {
  if (!value && !children) return null

  return (
    <div className={colSpan === 2 ? 'sm:col-span-2' : undefined}>
      <p className="text-muted-foreground">{label}</p>
      {children || <p className="font-medium">{value}</p>}
    </div>
  )
}

// ============================================
// Tags Section
// ============================================

interface TagsSectionProps {
  tags?: string[]
  className?: string
}

export function TagsSection({ tags, className }: TagsSectionProps) {
  if (!tags || tags.length === 0) return null

  return (
    <div className={cn('rounded-xl border p-4 bg-card', className)}>
      <h4 className="text-sm font-medium mb-2">Tags</h4>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Section Title
// ============================================

interface SectionTitleProps {
  children: React.ReactNode
  className?: string
}

export function SectionTitle({ children, className }: SectionTitleProps) {
  return <h4 className={cn('text-sm font-medium mb-2', className)}>{children}</h4>
}

// ============================================
// Secret Value Field (for credential leaks)
// ============================================

interface SecretValueFieldProps {
  /** The secret value to display */
  value?: string | null
  /** Label for the field */
  label?: string
  /** Whether to show a warning about the sensitivity */
  showWarning?: boolean
  /** Custom class name */
  className?: string
}

/**
 * SecretValueField displays a masked credential value with reveal/hide toggle.
 * Used for showing leaked passwords, API keys, etc. in credential leak details.
 */
export function SecretValueField({
  value,
  label = 'Secret Value',
  showWarning = true,
  className,
}: SecretValueFieldProps) {
  const [isRevealed, setIsRevealed] = React.useState(false)
  const [isCopied, setIsCopied] = React.useState(false)

  if (!value) {
    return (
      <div className={cn('rounded-xl border p-4 bg-card', className)}>
        <div className="flex items-center gap-2 mb-3">
          <Key className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">{label}</h4>
        </div>
        <p className="text-sm text-muted-foreground italic">No secret value available</p>
      </div>
    )
  }

  // Mask the value (show first 2 and last 2 chars if long enough)
  const getMaskedValue = (val: string): string => {
    if (val.length <= 4) {
      return '••••••••'
    }
    if (val.length <= 8) {
      return val[0] + '••••••' + val[val.length - 1]
    }
    return val.slice(0, 2) + '••••••••' + val.slice(-2)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setIsCopied(true)
      toast.success('Secret copied to clipboard')
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to copy to clipboard'))
    }
  }

  const displayValue = isRevealed ? value : getMaskedValue(value)

  return (
    <div className={cn('rounded-xl border p-4 bg-card', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Key className="h-4 w-4 text-amber-500" />
        <h4 className="text-sm font-medium">{label}</h4>
      </div>

      {/* Warning banner */}
      {showWarning && (
        <div className="flex items-start gap-2 p-2 mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            This is sensitive data. Handle with care and rotate if compromised.
          </p>
        </div>
      )}

      {/* Secret value with controls */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            type="text"
            value={displayValue}
            readOnly
            className={cn('font-mono text-sm pr-20', !isRevealed && 'tracking-wider')}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 min-h-[44px] min-w-[44px]"
                    onClick={() => setIsRevealed(!isRevealed)}
                    aria-label={isRevealed ? 'Hide secret' : 'Reveal secret'}
                  >
                    {isRevealed ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isRevealed ? 'Hide secret' : 'Reveal secret'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 min-h-[44px] min-w-[44px]"
                    onClick={handleCopy}
                    aria-label={isCopied ? 'Copied to clipboard' : 'Copy to clipboard'}
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isCopied ? 'Copied!' : 'Copy to clipboard'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Character count hint */}
      <p className="text-xs text-muted-foreground mt-2">{value.length} characters</p>
    </div>
  )
}
