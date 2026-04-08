'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Database } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetadataViewerProps {
  metadata: Record<string, unknown>
  /** Keys to exclude (already shown by source panel) */
  excludeKeys?: string[]
  className?: string
}

/**
 * Generic JSONB metadata viewer.
 * Renders key-value pairs for primitive values and expandable JSON for nested objects.
 */
export function MetadataViewer({ metadata, excludeKeys = [], className }: MetadataViewerProps) {
  const [expanded, setExpanded] = useState(false)

  // Filter out null/undefined/empty values and excluded keys
  const entries = Object.entries(metadata).filter(
    ([key, value]) =>
      value != null &&
      value !== '' &&
      !excludeKeys.includes(key) &&
      // Skip internal fields
      !key.startsWith('_')
  )

  if (entries.length === 0) return null

  // Split into simple (primitive) and complex (object/array) entries
  const simpleEntries = entries.filter(([, v]) => typeof v !== 'object' || v === null)
  const complexEntries = entries.filter(([, v]) => typeof v === 'object' && v !== null)

  const visibleEntries = expanded ? simpleEntries : simpleEntries.slice(0, 6)
  const hasMore = simpleEntries.length > 6 || complexEntries.length > 0

  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Scanner Metadata</span>
          </div>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" /> Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" /> Show all ({entries.length})
                </>
              )}
            </Button>
          )}
        </div>

        {/* Simple key-value pairs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {visibleEntries.map(([key, value]) => (
            <div key={key} className="flex items-baseline gap-2 text-xs">
              <span className="text-muted-foreground shrink-0 min-w-[100px]">{formatKey(key)}</span>
              <span className="font-mono truncate">{String(value)}</span>
            </div>
          ))}
        </div>

        {/* Complex entries (expanded only) */}
        {expanded && complexEntries.length > 0 && (
          <div className="mt-3 space-y-2">
            {complexEntries.map(([key, value]) => (
              <div key={key}>
                <div className="text-xs text-muted-foreground mb-1">{formatKey(key)}</div>
                <pre className="text-xs font-mono bg-muted/30 rounded p-2 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Convert snake_case to Title Case */
function formatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
