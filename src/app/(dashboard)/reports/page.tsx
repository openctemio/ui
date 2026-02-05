'use client'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileText,
  Download,
  Calendar,
  Clock,
  Plus,
  FileSpreadsheet,
  FileBarChart,
  FileCheck,
  Send,
  Eye,
  MoreHorizontal,
  TrendingUp,
} from 'lucide-react'

// Mock data for reports
const reportStats = {
  totalReports: 24,
  scheduled: 6,
  generatedThisMonth: 18,
  sharedExternal: 4,
}

const reportTemplates = [
  {
    id: 'tpl-001',
    name: 'Executive Summary',
    description: 'High-level security posture overview for leadership',
    icon: FileBarChart,
    lastUsed: '2 days ago',
    usageCount: 12,
  },
  {
    id: 'tpl-002',
    name: 'PCI-DSS Compliance',
    description: 'Detailed compliance status for PCI-DSS requirements',
    icon: FileCheck,
    lastUsed: '1 week ago',
    usageCount: 6,
  },
  {
    id: 'tpl-003',
    name: 'Technical Assessment',
    description: 'Detailed technical findings with remediation guidance',
    icon: FileText,
    lastUsed: '3 days ago',
    usageCount: 15,
  },
  {
    id: 'tpl-004',
    name: 'Vulnerability Report',
    description: 'Comprehensive vulnerability inventory and trends',
    icon: FileSpreadsheet,
    lastUsed: '1 day ago',
    usageCount: 24,
  },
]

const recentReports = [
  {
    id: 'rpt-001',
    name: 'Q1 2024 Executive Summary',
    template: 'Executive Summary',
    generatedBy: 'Nguyen Van An',
    generatedAt: '2024-03-10',
    status: 'completed',
    format: 'PDF',
    size: '2.4 MB',
  },
  {
    id: 'rpt-002',
    name: 'March Vulnerability Assessment',
    template: 'Vulnerability Report',
    generatedBy: 'Tran Thi Binh',
    generatedAt: '2024-03-08',
    status: 'completed',
    format: 'PDF',
    size: '5.1 MB',
  },
  {
    id: 'rpt-003',
    name: 'PCI-DSS Q1 Compliance',
    template: 'PCI-DSS Compliance',
    generatedBy: 'Le Van Cuong',
    generatedAt: '2024-03-05',
    status: 'completed',
    format: 'PDF',
    size: '3.8 MB',
  },
  {
    id: 'rpt-004',
    name: 'Weekly Technical Report #10',
    template: 'Technical Assessment',
    generatedBy: 'Pham Thi Dung',
    generatedAt: '2024-03-04',
    status: 'completed',
    format: 'PDF',
    size: '4.2 MB',
  },
  {
    id: 'rpt-005',
    name: 'Monthly Security Posture',
    template: 'Executive Summary',
    generatedBy: 'System',
    generatedAt: '2024-03-01',
    status: 'scheduled',
    format: 'PDF',
    size: '--',
  },
]

const scheduledReports = [
  {
    name: 'Weekly Vulnerability Summary',
    schedule: 'Every Monday 8:00 AM',
    recipients: 5,
    nextRun: 'Tomorrow',
  },
  {
    name: 'Monthly Executive Report',
    schedule: '1st of month 9:00 AM',
    recipients: 3,
    nextRun: 'Apr 1, 2024',
  },
  {
    name: 'Daily Scan Results',
    schedule: 'Daily 6:00 AM',
    recipients: 8,
    nextRun: 'Tomorrow',
  },
  {
    name: 'Quarterly Compliance Report',
    schedule: 'Quarterly',
    recipients: 4,
    nextRun: 'Apr 1, 2024',
  },
]

const statusConfig: Record<string, { color: string; bgColor: string }> = {
  completed: { color: 'text-green-400', bgColor: 'bg-green-500/20' },
  scheduled: { color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  generating: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  failed: { color: 'text-red-400', bgColor: 'bg-red-500/20' },
}

export default function ReportsPage() {
  return (
    <>
      <Main>
        <PageHeader
          title="Security Reports"
          description="Generate, schedule, and export security reports"
        />

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total Reports
              </CardDescription>
              <CardTitle className="text-3xl">{reportStats.totalReports}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Scheduled
              </CardDescription>
              <CardTitle className="text-3xl text-blue-500">{reportStats.scheduled}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                This Month
              </CardDescription>
              <CardTitle className="text-3xl text-green-500">
                {reportStats.generatedThisMonth}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Shared External
              </CardDescription>
              <CardTitle className="text-3xl">{reportStats.sharedExternal}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Report Templates */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Report Templates</CardTitle>
                  <CardDescription>Pre-configured report formats</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {reportTemplates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:bg-muted/50">
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                        <template.icon className="text-primary h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h4 className="text-sm font-medium">{template.name}</h4>
                        <p className="text-muted-foreground text-xs">{template.description}</p>
                        <div className="text-muted-foreground flex items-center gap-3 text-xs">
                          <span>Last used: {template.lastUsed}</span>
                          <span>-</span>
                          <span>{template.usageCount} generated</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Scheduled Reports */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Scheduled Reports</CardTitle>
              <CardDescription>Automated report generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {scheduledReports.map((report, idx) => (
                <div key={idx} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{report.name}</p>
                      <div className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        <span>{report.schedule}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {report.recipients} recipients
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">Next: {report.nextRun}</p>
                </div>
              ))}
              <Button variant="outline" className="w-full" size="sm">
                <Calendar className="mr-2 h-4 w-4" />
                Schedule New
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports Table */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Reports</CardTitle>
                <CardDescription>Generated reports history</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Name</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Generated By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentReports.map((report) => {
                  const status = statusConfig[report.status]
                  return (
                    <TableRow key={report.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <FileText className="text-muted-foreground h-4 w-4" />
                          <span className="font-medium">{report.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {report.template}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {report.generatedBy}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {report.generatedAt}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {report.format}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{report.size}</TableCell>
                      <TableCell>
                        <Badge className={`${status.bgColor} ${status.color} border-0`}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {report.status === 'completed' && (
                            <>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
