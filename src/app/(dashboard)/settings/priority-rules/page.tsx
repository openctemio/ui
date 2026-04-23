'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, MoreHorizontal, Pencil, Trash2, Info, X, FlaskConical } from 'lucide-react'
import { toast } from 'sonner'
import { get, post, put, del } from '@/lib/api/client'
import { PriorityClassBadge } from '@/features/findings/components/priority-class-badge'
import type { PriorityClass } from '@/features/findings/types/finding.types'
import { DryRunDialog, type DryRunRule } from './dry-run-dialog'

type FieldKey =
  | 'is_in_kev'
  | 'is_reachable'
  | 'asset_is_crown_jewel'
  | 'epss_score'
  | 'severity'
  | 'asset_criticality'

type FieldType = 'bool' | 'float' | 'string'

type Operator = 'eq' | 'neq' | 'gte' | 'lte' | 'in'

interface Condition {
  field: FieldKey
  operator: Operator
  value: unknown
}

interface PriorityRule {
  id: string
  name: string
  description?: string
  priority_class: PriorityClass
  conditions: Condition[]
  is_active: boolean
  evaluation_order: number
  created_at: string
  updated_at: string
}

interface ListResponse {
  data?: PriorityRule[]
}

const FIELD_CONFIG: Record<FieldKey, { label: string; type: FieldType; options?: string[] }> = {
  is_in_kev: { label: 'Is in KEV catalog', type: 'bool' },
  is_reachable: { label: 'Is reachable', type: 'bool' },
  asset_is_crown_jewel: { label: 'Asset is crown jewel', type: 'bool' },
  epss_score: { label: 'EPSS score', type: 'float' },
  severity: {
    label: 'Severity',
    type: 'string',
    options: ['critical', 'high', 'medium', 'low', 'info'],
  },
  asset_criticality: {
    label: 'Asset criticality',
    type: 'string',
    options: ['critical', 'high', 'medium', 'low'],
  },
}

const OPERATOR_LABEL: Record<Operator, string> = {
  eq: '=',
  neq: '!=',
  gte: '>=',
  lte: '<=',
  in: 'in',
}

const PRIORITY_CLASSES: PriorityClass[] = ['P0', 'P1', 'P2', 'P3']

function operatorsFor(type: FieldType): Operator[] {
  switch (type) {
    case 'bool':
      return ['eq', 'neq']
    case 'float':
      return ['eq', 'gte', 'lte']
    case 'string':
      return ['eq', 'neq', 'in']
  }
}

function emptyConditionFor(field: FieldKey): Condition {
  const type = FIELD_CONFIG[field].type
  const ops = operatorsFor(type)
  let value: unknown = ''
  if (type === 'bool') value = true
  else if (type === 'float') value = 0
  return { field, operator: ops[0], value }
}

function formatConditionValue(c: Condition): string {
  const type = FIELD_CONFIG[c.field]?.type
  if (type === 'bool') return String(Boolean(c.value))
  if (c.operator === 'in' && Array.isArray(c.value)) return `[${c.value.join(', ')}]`
  if (typeof c.value === 'string' || typeof c.value === 'number') return String(c.value)
  return JSON.stringify(c.value)
}

interface FormState {
  name: string
  description: string
  priority_class: PriorityClass
  evaluation_order: string
  is_active: boolean
  conditions: Condition[]
}

const emptyForm: FormState = {
  name: '',
  description: '',
  priority_class: 'P1',
  evaluation_order: '50',
  is_active: true,
  conditions: [],
}

export default function PriorityRulesPage() {
  const { data, mutate, isLoading } = useSWR<ListResponse>(
    '/api/v1/priority-rules',
    (url: string) => get<ListResponse>(url)
  )

  const rules: PriorityRule[] = useMemo(() => {
    const list = data?.data ?? []
    return [...list].sort((a, b) => b.evaluation_order - a.evaluation_order)
  }, [data])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PriorityRule | null>(null)
  const [deletingRule, setDeletingRule] = useState<PriorityRule | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [dryRunRule, setDryRunRule] = useState<DryRunRule | null>(null)

  function openCreate() {
    setEditingRule(null)
    setForm(emptyForm)
    setIsDialogOpen(true)
  }

  function openEdit(rule: PriorityRule) {
    setEditingRule(rule)
    setForm({
      name: rule.name,
      description: rule.description ?? '',
      priority_class: rule.priority_class,
      evaluation_order: String(rule.evaluation_order),
      is_active: rule.is_active,
      conditions: (rule.conditions ?? []).map((c) => ({ ...c })),
    })
    setIsDialogOpen(true)
  }

  function addCondition() {
    setForm((prev) => ({
      ...prev,
      conditions: [...prev.conditions, emptyConditionFor('is_in_kev')],
    }))
  }

  function removeCondition(idx: number) {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== idx),
    }))
  }

  function updateCondition(idx: number, patch: Partial<Condition>) {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }))
  }

  function changeConditionField(idx: number, field: FieldKey) {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => (i === idx ? emptyConditionFor(field) : c)),
    }))
  }

  function changeConditionOperator(idx: number, operator: Operator) {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => {
        if (i !== idx) return c
        // Reset value if switching to/from "in"
        if (operator === 'in') {
          return { ...c, operator, value: Array.isArray(c.value) ? c.value : [] }
        }
        if (c.operator === 'in') {
          return { ...c, operator, value: '' }
        }
        return { ...c, operator }
      }),
    }))
  }

  async function toggleActive(rule: PriorityRule, nextActive: boolean) {
    try {
      await put(`/api/v1/priority-rules/${rule.id}`, {
        name: rule.name,
        description: rule.description ?? '',
        priority_class: rule.priority_class,
        conditions: rule.conditions,
        evaluation_order: rule.evaluation_order,
        is_active: nextActive,
      })
      await mutate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update rule'
      toast.error(message)
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }

    const orderNum = Number(form.evaluation_order)
    if (!Number.isFinite(orderNum)) {
      toast.error('Evaluation order must be a number')
      return
    }

    // Normalize conditions
    const normalizedConditions: Condition[] = []
    for (const c of form.conditions) {
      const type = FIELD_CONFIG[c.field].type
      let value: unknown = c.value
      if (type === 'bool') {
        value = Boolean(c.value)
      } else if (type === 'float') {
        const n = typeof c.value === 'number' ? c.value : Number(c.value)
        if (!Number.isFinite(n)) {
          toast.error(`Invalid number for ${c.field}`)
          return
        }
        value = n
      } else if (c.operator === 'in') {
        if (typeof c.value === 'string') {
          value = c.value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        } else if (!Array.isArray(c.value)) {
          value = []
        }
      } else {
        value = String(c.value ?? '')
      }
      normalizedConditions.push({ field: c.field, operator: c.operator, value })
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim(),
      priority_class: form.priority_class,
      conditions: normalizedConditions,
      evaluation_order: orderNum,
      is_active: form.is_active,
    }

    setIsSaving(true)
    try {
      if (editingRule) {
        await put(`/api/v1/priority-rules/${editingRule.id}`, payload)
        toast.success('Priority rule updated')
      } else {
        await post('/api/v1/priority-rules', payload)
        toast.success('Priority rule created')
      }
      setIsDialogOpen(false)
      setEditingRule(null)
      setForm(emptyForm)
      await mutate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save priority rule'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingRule) return
    try {
      await del(`/api/v1/priority-rules/${deletingRule.id}`)
      toast.success('Priority rule deleted')
      setDeletingRule(null)
      await mutate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete priority rule'
      toast.error(message)
    }
  }

  function renderValueInput(c: Condition, idx: number) {
    const cfg = FIELD_CONFIG[c.field]
    if (cfg.type === 'bool') {
      return (
        <Select
          value={String(Boolean(c.value))}
          onValueChange={(v) => updateCondition(idx, { value: v === 'true' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">true</SelectItem>
            <SelectItem value="false">false</SelectItem>
          </SelectContent>
        </Select>
      )
    }

    if (cfg.type === 'float') {
      return (
        <Input
          type="number"
          step="0.01"
          value={typeof c.value === 'number' || typeof c.value === 'string' ? String(c.value) : ''}
          onChange={(e) => updateCondition(idx, { value: e.target.value })}
          placeholder="0.0"
        />
      )
    }

    // string
    if (c.operator === 'in') {
      const arr = Array.isArray(c.value)
        ? c.value.join(', ')
        : typeof c.value === 'string'
          ? c.value
          : ''
      return (
        <Input
          value={arr}
          onChange={(e) => updateCondition(idx, { value: e.target.value })}
          placeholder="critical, high"
        />
      )
    }

    if (cfg.options) {
      return (
        <Select
          value={typeof c.value === 'string' ? c.value : ''}
          onValueChange={(v) => updateCondition(idx, { value: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {cfg.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    return (
      <Input
        value={typeof c.value === 'string' ? c.value : ''}
        onChange={(e) => updateCondition(idx, { value: e.target.value })}
      />
    )
  }

  return (
    <Main>
      <PageHeader
        title="Priority Override Rules"
        description="Define rules that override the calculated finding priority based on conditions."
      >
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
      </PageHeader>

      <Alert className="mt-6">
        <Info className="h-4 w-4" />
        <AlertTitle>How evaluation works</AlertTitle>
        <AlertDescription>
          Rules are evaluated in descending order of <strong>Evaluation Order</strong> (higher
          wins). The first active rule whose conditions all match sets the finding&apos;s priority
          class. Inactive rules are skipped.
        </AlertDescription>
      </Alert>

      <Card className="mt-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Target Class</TableHead>
                <TableHead>Conditions</TableHead>
                <TableHead className="w-[140px]">Evaluation Order</TableHead>
                <TableHead className="w-[90px]">Active</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No priority rules yet. Click &quot;Create Rule&quot; to add one.
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div className="font-medium">{rule.name}</div>
                      {rule.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {rule.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <PriorityClassBadge priorityClass={rule.priority_class} showTooltip={false} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(rule.conditions ?? []).length === 0 ? (
                          <span className="text-xs text-muted-foreground">No conditions</span>
                        ) : (
                          (rule.conditions ?? []).map((c, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs font-mono"
                              title={`${c.field} ${OPERATOR_LABEL[c.operator]} ${formatConditionValue(c)}`}
                            >
                              {c.field} {OPERATOR_LABEL[c.operator]} {formatConditionValue(c)}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{rule.evaluation_order}</TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => toggleActive(rule, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(rule)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setDryRunRule({
                                name: rule.name,
                                priority_class: rule.priority_class,
                                conditions: rule.conditions,
                              })
                            }
                          >
                            <FlaskConical className="mr-2 h-4 w-4" />
                            Dry run
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-500"
                            onClick={() => setDeletingRule(rule)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Priority Rule' : 'Create Priority Rule'}</DialogTitle>
            <DialogDescription>
              Define conditions that will override the calculated finding priority.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. KEV on crown jewel → P0"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Explain when and why this rule applies"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority_class">Target Priority Class</Label>
                <Select
                  value={form.priority_class}
                  onValueChange={(value) =>
                    setForm({ ...form, priority_class: value as PriorityClass })
                  }
                >
                  <SelectTrigger id="priority_class">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_CLASSES.map((pc) => (
                      <SelectItem key={pc} value={pc}>
                        {pc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="evaluation_order">Evaluation Order</Label>
                <Input
                  id="evaluation_order"
                  type="number"
                  value={form.evaluation_order}
                  onChange={(e) => setForm({ ...form, evaluation_order: e.target.value })}
                  placeholder="50"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="is_active">Active</Label>
                <div className="flex h-9 items-center">
                  <Switch
                    id="is_active"
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Conditions</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Condition
                </Button>
              </div>
              {form.conditions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No conditions. Rule will match all findings.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {form.conditions.map((c, idx) => {
                    const type = FIELD_CONFIG[c.field].type
                    const ops = operatorsFor(type)
                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-[1fr_120px_1fr_auto] gap-2 items-start"
                      >
                        <Select
                          value={c.field}
                          onValueChange={(v) => changeConditionField(idx, v as FieldKey)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(FIELD_CONFIG) as FieldKey[]).map((k) => (
                              <SelectItem key={k} value={k}>
                                {FIELD_CONFIG[k].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={c.operator}
                          onValueChange={(v) => changeConditionOperator(idx, v as Operator)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ops.map((op) => (
                              <SelectItem key={op} value={op}>
                                {OPERATOR_LABEL[op]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {renderValueInput(c, idx)}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => removeCondition(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              disabled={form.conditions.length === 0}
              onClick={() =>
                setDryRunRule({
                  name: form.name,
                  priority_class: form.priority_class,
                  conditions: form.conditions,
                })
              }
            >
              <FlaskConical className="mr-1 h-4 w-4" />
              Dry run
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingRule ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DryRunDialog
        open={!!dryRunRule}
        onOpenChange={(open) => !open && setDryRunRule(null)}
        rule={dryRunRule}
      />

      <AlertDialog open={!!deletingRule} onOpenChange={(open) => !open && setDeletingRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete priority rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deletingRule?.name}&quot;. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Main>
  )
}
