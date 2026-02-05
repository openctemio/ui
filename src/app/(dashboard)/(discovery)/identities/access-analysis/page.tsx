'use client'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, ShieldAlert, UserX, AlertTriangle } from 'lucide-react'

// Mock stats data
const accessAnalysisStats = [
  {
    title: 'Total Issues',
    value: '156',
    description: 'Access and permission issues',
    icon: Lock,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-500/10',
  },
  {
    title: 'Over-Privileged',
    value: '78',
    description: 'Excessive permissions',
    icon: ShieldAlert,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-500/10',
  },
  {
    title: 'Orphaned Access',
    value: '45',
    description: 'Access without owners',
    icon: UserX,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-500/10',
  },
  {
    title: 'Critical Risks',
    value: '33',
    description: 'High severity issues',
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-500/10',
  },
]

export default function AccessAnalysisPage() {
  return (
    <>
      <Main>
        <PageHeader title="Access Analysis" description="Permission and access analysis" />

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {accessAnalysisStats.map((stat) => (
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
