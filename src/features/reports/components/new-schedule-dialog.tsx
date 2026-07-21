'use client'

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { CRON_PRESETS, humanizeCron } from '../lib/cron'
import type { CreateReportScheduleInput, ReportType } from '../types'

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'executive_summary', label: 'Executive Summary' },
  { value: 'summary', label: 'Summary Digest' },
  { value: 'findings', label: 'Findings Digest' },
]

const WEEKDAYS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
]

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Singapore',
  'Asia/Ho_Chi_Minh',
  'Asia/Tokyo',
  'Australia/Sydney',
]

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface NewScheduleDialogProps {
  onCreate: (input: CreateReportScheduleInput) => Promise<unknown>
}

export function NewScheduleDialog({ onCreate }: NewScheduleDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [reportType, setReportType] = useState<ReportType>('executive_summary')
  const [cadence, setCadence] = useState<keyof typeof CRON_PRESETS>('daily')
  const [time, setTime] = useState('08:00')
  const [weekday, setWeekday] = useState('1')
  const [monthDay, setMonthDay] = useState('1')
  const [customCron, setCustomCron] = useState('0 8 * * *')
  const timezones = useMemo(() => {
    const detected = detectTimezone()
    return Array.from(new Set([detected, ...COMMON_TIMEZONES]))
  }, [])
  const [timezone, setTimezone] = useState(() => detectTimezone())

  const [recipientInput, setRecipientInput] = useState('')
  const [recipients, setRecipients] = useState<string[]>([])

  const cron = useMemo(() => {
    if (cadence === 'custom') return customCron.trim()
    const [h, m] = time.split(':').map((v) => parseInt(v, 10))
    const hour = Number.isFinite(h) ? h : 8
    const minute = Number.isFinite(m) ? m : 0
    return CRON_PRESETS[cadence].build(hour, minute, parseInt(weekday, 10), parseInt(monthDay, 10))
  }, [cadence, customCron, time, weekday, monthDay])

  const cronPreview = useMemo(() => (cron ? humanizeCron(cron) : ''), [cron])

  const addRecipient = useCallback(() => {
    const value = recipientInput.trim()
    if (!value) return
    if (!EMAIL_RE.test(value)) {
      toast.error('Enter a valid email address')
      return
    }
    if (recipients.includes(value)) {
      setRecipientInput('')
      return
    }
    setRecipients((prev) => [...prev, value])
    setRecipientInput('')
  }, [recipientInput, recipients])

  const removeRecipient = useCallback((email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email))
  }, [])

  const resetForm = useCallback(() => {
    setName('')
    setReportType('executive_summary')
    setCadence('daily')
    setTime('08:00')
    setWeekday('1')
    setMonthDay('1')
    setCustomCron('0 8 * * *')
    setTimezone(detectTimezone())
    setRecipientInput('')
    setRecipients([])
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!cron) {
      toast.error('A cron expression is required')
      return
    }
    if (recipients.length === 0) {
      toast.error('Add at least one recipient — the digest is emailed to them')
      return
    }
    setSubmitting(true)
    try {
      await onCreate({
        name: name.trim(),
        report_type: reportType,
        format: 'html',
        cron_expression: cron,
        timezone,
        recipients: recipients.map((email) => ({ email })),
      })
      toast.success('Schedule created')
      resetForm()
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create schedule')
    } finally {
      setSubmitting(false)
    }
  }, [name, cron, recipients, reportType, timezone, onCreate, resetForm])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New report schedule</DialogTitle>
          <DialogDescription>
            On the chosen cadence, OpenCTEM renders a finding-summary digest and emails it to the
            recipients below. It does not store a downloadable file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="schedule-name">Name</Label>
            <Input
              id="schedule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekly exec digest"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Report type</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value="html" disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="html">HTML email digest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cadence</Label>
              <Select
                value={cadence}
                onValueChange={(v) => setCadence(v as keyof typeof CRON_PRESETS)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CRON_PRESETS).map(([key, preset]) => (
                    <SelectItem key={key} value={key}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {cadence !== 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="schedule-time">Time</Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            )}
          </div>

          {cadence === 'weekly' && (
            <div className="space-y-2">
              <Label>Day of week</Label>
              <Select value={weekday} onValueChange={setWeekday}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {cadence === 'monthly' && (
            <div className="space-y-2">
              <Label htmlFor="schedule-monthday">Day of month</Label>
              <Input
                id="schedule-monthday"
                type="number"
                min={1}
                max={28}
                value={monthDay}
                onChange={(e) => setMonthDay(e.target.value)}
              />
            </div>
          )}

          {cadence === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="schedule-cron">Cron expression</Label>
              <Input
                id="schedule-cron"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                placeholder="0 8 * * 1"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Standard 5-field cron: minute hour day-of-month month day-of-week.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {cronPreview && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Runs <span className="font-medium text-foreground">{cronPreview}</span> ({timezone})
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="schedule-recipient">Recipients</Label>
            <div className="flex gap-2">
              <Input
                id="schedule-recipient"
                type="email"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addRecipient()
                  }
                }}
                placeholder="exec@company.com"
              />
              <Button type="button" variant="outline" onClick={addRecipient}>
                Add
              </Button>
            </div>
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {recipients.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => removeRecipient(email)}
                      aria-label={`Remove ${email}`}
                      className="ml-1 rounded-full hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
