'use client'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { StatsCard } from '@/features/shared/components/stats-card'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  KeyRound,
  Plus,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react'

function LoadingSkeleton() {
  return (
    <Main>
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </Main>
  )
}

export default function APIKeysPage() {
  const { currentTenant } = useTenant()
  const { isLoading } = useDashboardStats(currentTenant?.id || null)

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <Main>
      <PageHeader title="API Keys" description="Manage API keys for programmatic access">
        <Button disabled>
          <Plus className="h-4 w-4" />
          Generate API Key
        </Button>
      </PageHeader>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatsCard title="Total Keys" value={0} icon={KeyRound} description="No keys created" />
        <StatsCard
          title="Active Keys"
          value={0}
          icon={ShieldCheck}
          changeType="neutral"
          description="Currently valid"
        />
        <StatsCard
          title="Expired Keys"
          value={0}
          icon={AlertTriangle}
          changeType="neutral"
          description="Need rotation"
        />
        <StatsCard title="Unique Scopes" value={0} icon={Eye} description="Permissions granted" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            API Key Management
          </CardTitle>
          <CardDescription>
            Generate and manage API keys for programmatic access. Each key can be scoped to specific
            permissions and set to expire automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <KeyRound className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-1 text-lg font-semibold">Coming Soon</h3>
            <p className="text-muted-foreground mb-4 max-w-sm text-center text-sm">
              This feature requires dedicated API endpoints. Configure via API to see data here.
            </p>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Security Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              Set expiration dates on all API keys and rotate them regularly.
            </li>
            <li className="flex items-start gap-2">
              <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
              Use the minimum required scopes for each key. Follow the principle of least privilege.
            </li>
            <li className="flex items-start gap-2">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" />
              Rotate keys immediately if you suspect they have been compromised.
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Never embed API keys directly in source code. Use environment variables or secret
              managers.
            </li>
          </ul>
        </CardContent>
      </Card>
    </Main>
  )
}
