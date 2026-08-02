'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Download, ShieldAlert, ListChecks, Gauge, AlertOctagon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useExecutiveSummary, downloadExecutiveSummaryCsv } from '../hooks/use-report-schedules'

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]

function Metric({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof Gauge
  label: string
  value: string | number
  loading: boolean
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      )}
    </div>
  )
}

export function ExecutiveSummarySection() {
  const [days, setDays] = useState('30')
  const [downloading, setDownloading] = useState(false)
  const { summary, isLoading } = useExecutiveSummary(parseInt(days, 10))

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      await downloadExecutiveSummaryCsv(parseInt(days, 10))
      toast.success('Executive summary exported')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setDownloading(false)
    }
  }, [days])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Executive summary</CardTitle>
          <CardDescription>
            Program-level risk, findings, SLA, and MTTR metrics for the selected window. Download a
            CSV for board decks and stakeholder updates.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleDownload} disabled={downloading}>
            <Download className="h-4 w-4" />
            {downloading ? 'Preparing…' : 'Download CSV'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            icon={Gauge}
            label="Risk score"
            value={summary ? summary.risk_score_current.toFixed(1) : '—'}
            loading={isLoading}
          />
          <Metric
            icon={ListChecks}
            label="Open findings"
            value={summary ? summary.findings_total : '—'}
            loading={isLoading}
          />
          <Metric
            icon={AlertOctagon}
            label="P0 open"
            value={summary ? summary.p0_open : '—'}
            loading={isLoading}
          />
          <Metric
            icon={ShieldAlert}
            label="SLA compliance"
            value={summary ? `${summary.sla_compliance_pct.toFixed(0)}%` : '—'}
            loading={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  )
}
