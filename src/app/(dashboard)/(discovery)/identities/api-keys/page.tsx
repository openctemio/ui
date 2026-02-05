'use client'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Key, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

// Mock stats data
const apiKeyStats = [
  {
    title: 'Total API Keys',
    value: '312',
    description: 'All API keys and tokens',
    icon: Key,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-500/10',
  },
  {
    title: 'Active Keys',
    value: '267',
    description: 'Currently valid',
    icon: CheckCircle,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-500/10',
  },
  {
    title: 'Expiring Soon',
    value: '23',
    description: 'Within 30 days',
    icon: Clock,
    iconColor: 'text-yellow-500',
    iconBg: 'bg-yellow-500/10',
  },
  {
    title: 'Expired',
    value: '22',
    description: 'Need rotation',
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-500/10',
  },
]

export default function ApiKeysPage() {
  return (
    <>
      <Main>
        <PageHeader title="API Keys" description="API keys and access tokens" />

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {apiKeyStats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <div className={`rounded-md p-1 ${stat.iconBg}`}>
                    <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                  </div>
                  {stat.title}
                </CardDescription>
                <CardTitle className="text-3xl">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Main>
    </>
  )
}
