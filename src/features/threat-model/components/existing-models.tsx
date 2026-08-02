'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/features/shared'
import { cn } from '@/lib/utils'
import { ChevronRight, ScanSearch } from 'lucide-react'
import type { ThreatModelSummary } from '../types'

interface ExistingModelsProps {
  models: ThreatModelSummary[]
  selectedId?: string | null
  onOpen: (id: string) => void
}

/** Previously generated threat models — open one without regenerating. */
export function ExistingModels({ models, selectedId, onOpen }: ExistingModelsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Existing threat models</CardTitle>
      </CardHeader>
      <CardContent>
        {models.length === 0 ? (
          <EmptyState
            icon={ScanSearch}
            title="No threat models yet"
            description="Generate one from a crown-jewel scope above to get started."
            card={false}
          />
        ) : (
          <ul className="divide-y">
            {models.map((m) => {
              const coverage = Math.round(m.coverage_pct)
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(m.id)}
                    className={cn(
                      'hover:bg-muted/50 flex w-full items-center gap-4 rounded-md px-2 py-3 text-start transition-colors',
                      selectedId === m.id && 'bg-muted'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{m.name}</p>
                      <p className="text-muted-foreground text-xs">
                        Generated {formatDate(m.generated_at)} · {m.technique_dataset_version}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {m.threats_open > 0 && (
                        <Badge
                          variant="outline"
                          className="border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
                        >
                          {m.threats_open} open
                        </Badge>
                      )}
                      <Badge variant="secondary">{m.threats_total} threats</Badge>
                      <span className="text-muted-foreground w-14 text-end text-sm tabular-nums">
                        {coverage}% cov
                      </span>
                      <ChevronRight className="text-muted-foreground h-4 w-4" />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}
