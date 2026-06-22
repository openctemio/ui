'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { mutate } from 'swr'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import { useUpdateIntegrationApi } from '../api/use-integrations-api'
import type { Integration } from '../types/integration.types'

// ── editing model ──────────────────────────────────────────
// Match dimensions are edited as comma-separated text (simple + matches the
// backend, which accepts a string or array and lower-cases everything).
interface RuleDraft {
  projectKey: string
  issueType: string
  severity: string
  scope: string
  criticality: string
  tag: string
}

type StoredMatch = {
  severity?: string[]
  scope?: string[]
  criticality?: string[]
  tag?: string[]
  asset_group?: string[]
}
type StoredRule = { match?: StoredMatch; project_key?: string; issue_type?: string }

function csvToArray(s: string): string[] {
  return s
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
}

function arrayToCsv(a?: string[]): string {
  return (a ?? []).join(', ')
}

function getTicketingConfig(integration: Integration): Record<string, unknown> {
  const cfg = integration.config as Record<string, unknown> | undefined
  return (cfg?.ticketing as Record<string, unknown> | undefined) ?? {}
}

function draftsFromConfig(integration: Integration): RuleDraft[] {
  const routing = (getTicketingConfig(integration).routing as StoredRule[] | undefined) ?? []
  return routing.map((r) => ({
    projectKey: r.project_key ?? '',
    issueType: r.issue_type ?? '',
    severity: arrayToCsv(r.match?.severity),
    scope: arrayToCsv(r.match?.scope),
    criticality: arrayToCsv(r.match?.criticality),
    tag: arrayToCsv(r.match?.tag),
  }))
}

function emptyDraft(): RuleDraft {
  return { projectKey: '', issueType: '', severity: '', scope: '', criticality: '', tag: '' }
}

/**
 * Edit config.ticketing.routing — ordered rules that route a finding's ticket to
 * a project by matching the finding/asset attributes (RFC-006 Phase 4a,
 * api#209). First match wins; rules without a project key are dropped on save.
 */
export function RoutingRulesDialog({
  integration,
  open,
  onOpenChange,
}: {
  integration: Integration
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [rules, setRules] = useState<RuleDraft[]>(() => draftsFromConfig(integration))
  const { trigger: update, isMutating } = useUpdateIntegrationApi(integration.id)

  function updateRule(index: number, patch: Partial<RuleDraft>) {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function addRule() {
    setRules((prev) => [...prev, emptyDraft()])
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    // Drop rules with no destination project (they could never route). Build the
    // stored shape, omitting empty match dimensions.
    const routing: StoredRule[] = rules
      .filter((r) => r.projectKey.trim() !== '')
      .map((r) => {
        const match: StoredMatch = {}
        const severity = csvToArray(r.severity)
        const scope = csvToArray(r.scope)
        const criticality = csvToArray(r.criticality)
        const tag = csvToArray(r.tag)
        if (severity.length) match.severity = severity
        if (scope.length) match.scope = scope
        if (criticality.length) match.criticality = criticality
        if (tag.length) match.tag = tag
        const rule: StoredRule = { project_key: r.projectKey.trim() }
        if (Object.keys(match).length) rule.match = match
        if (r.issueType.trim()) rule.issue_type = r.issueType.trim()
        return rule
      })

    try {
      const existingConfig = (integration.config as Record<string, unknown>) ?? {}
      const existingTicketing = (existingConfig.ticketing as Record<string, unknown>) ?? {}
      await update({
        config: {
          ...existingConfig,
          ticketing: { ...existingTicketing, routing },
        },
      })
      toast.success('Routing rules saved')
      await mutate('/api/v1/integrations?category=ticketing')
      onOpenChange(false)
    } catch {
      toast.error('Failed to save routing rules')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Routing rules — {integration.name}</DialogTitle>
          <DialogDescription>
            Route a finding&apos;s ticket to a project by matching its attributes. Rules are
            evaluated top-to-bottom; the first match wins, then the default project. Conditions are
            comma-separated and case-insensitive; leave a condition blank to match anything.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {rules.length === 0 && (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
              No routing rules. Tickets use the default project. Add a rule to route by team /
              severity / asset.
            </p>
          )}

          {rules.map((rule, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium">Rule {i + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRule(i)}
                  aria-label={`Remove rule ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`pk-${i}`}>Project key</Label>
                  <Input
                    id={`pk-${i}`}
                    value={rule.projectKey}
                    onChange={(e) => updateRule(i, { projectKey: e.target.value.toUpperCase() })}
                    placeholder="e.g. PAY"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`it-${i}`}>Issue type (optional)</Label>
                  <Input
                    id={`it-${i}`}
                    value={rule.issueType}
                    onChange={(e) => updateRule(i, { issueType: e.target.value })}
                    placeholder="e.g. Bug"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`sev-${i}`}>Severity</Label>
                  <Input
                    id={`sev-${i}`}
                    value={rule.severity}
                    onChange={(e) => updateRule(i, { severity: e.target.value })}
                    placeholder="critical, high"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`scope-${i}`}>Asset scope</Label>
                  <Input
                    id={`scope-${i}`}
                    value={rule.scope}
                    onChange={(e) => updateRule(i, { scope: e.target.value })}
                    placeholder="external, cloud"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`crit-${i}`}>Asset criticality</Label>
                  <Input
                    id={`crit-${i}`}
                    value={rule.criticality}
                    onChange={(e) => updateRule(i, { criticality: e.target.value })}
                    placeholder="critical, high"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`tag-${i}`}>Finding tags</Label>
                  <Input
                    id={`tag-${i}`}
                    value={rule.tag}
                    onChange={(e) => updateRule(i, { tag: e.target.value })}
                    placeholder="pci, payments"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addRule}>
            <Plus className="me-2 h-4 w-4" />
            Add rule
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isMutating}>
            {isMutating ? 'Saving...' : 'Save rules'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
