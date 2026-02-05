'use client'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, CheckCircle, AlertTriangle, Shield } from 'lucide-react'

// Mock stats data
const serviceAccountStats = [
  {
    title: 'Total Service Accounts',
    value: '89',
    description: 'All non-human identities',
    icon: Bot,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-500/10',
  },
  {
    title: 'Active',
    value: '72',
    description: 'Currently in use',
    icon: CheckCircle,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-500/10',
  },
  {
    title: 'Over-Privileged',
    value: '15',
    description: 'Excessive permissions',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-500/10',
  },
  {
    title: 'Admin Access',
    value: '8',
    description: 'With admin privileges',
    icon: Shield,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-500/10',
  },
]

export default function ServiceAccountsPage() {
  return (
    <>
      <Main>
        <PageHeader title="Service Accounts" description="Non-human service accounts" />

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {serviceAccountStats.map((stat) => (
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
