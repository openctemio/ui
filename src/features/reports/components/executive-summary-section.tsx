'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MetricStrip } from '@/features/shared'
import { useExecutiveSummary, downloadExecutiveSummaryCsv } from '../hooks/use-report-schedules'

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]

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
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Executive summary</h2>
          <p className="text-sm text-muted-foreground">
            Program-level risk, findings, SLA and MTTR for the selected window — download a CSV for
            board decks and stakeholder updates.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="h-9 w-[150px]" aria-label="Period">
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
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="me-2 h-4 w-4" />
            {downloading ? 'Preparing…' : 'Download CSV'}
          </Button>
        </div>
      </div>
      <MetricStrip
        loading={isLoading}
        items={[
          {
            key: 'risk',
            label: 'Risk score',
            value: summary ? summary.risk_score_current.toFixed(1) : '—',
          },
          { key: 'open', label: 'Open findings', value: summary ? summary.findings_total : '—' },
          {
            key: 'p0',
            label: 'P0 open',
            value: summary ? summary.p0_open : '—',
            tone: 'danger',
          },
          {
            key: 'sla',
            label: 'SLA compliance',
            value: summary ? `${summary.sla_compliance_pct.toFixed(0)}%` : '—',
          },
        ]}
      />
    </section>
  )
}
