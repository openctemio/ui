'use client'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Puzzle, CheckCircle, AlertTriangle, Shield } from 'lucide-react'

// Mock stats data
const oauthAppStats = [
  {
    title: 'Total OAuth Apps',
    value: '45',
    description: 'Connected third-party apps',
    icon: Puzzle,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-500/10',
  },
  {
    title: 'Authorized',
    value: '38',
    description: 'Approved applications',
    icon: CheckCircle,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-500/10',
  },
  {
    title: 'High Risk',
    value: '5',
    description: 'Excessive permissions',
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-500/10',
  },
  {
    title: 'Pending Review',
    value: '2',
    description: 'Awaiting approval',
    icon: Shield,
    iconColor: 'text-yellow-500',
    iconBg: 'bg-yellow-500/10',
  },
]

export default function OAuthAppsPage() {
  return (
    <>
      <Main>
        <PageHeader title="OAuth Apps" description="Third-party OAuth applications" />

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {oauthAppStats.map((stat) => (
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
