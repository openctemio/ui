'use client'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Bot, Key, Puzzle, KeyRound, ShieldAlert } from 'lucide-react'

// Mock stats data
const identityStats = [
  {
    title: 'Total Users',
    value: '1,247',
    description: 'Human user accounts',
    icon: Users,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-500/10',
  },
  {
    title: 'Service Accounts',
    value: '89',
    description: 'Non-human identities',
    icon: Bot,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-500/10',
  },
  {
    title: 'API Keys',
    value: '312',
    description: 'Active API keys',
    icon: Key,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-500/10',
  },
  {
    title: 'OAuth Apps',
    value: '45',
    description: 'Connected applications',
    icon: Puzzle,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-500/10',
  },
  {
    title: 'Exposed Credentials',
    value: '23',
    description: 'Credentials at risk',
    icon: KeyRound,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-500/10',
  },
  {
    title: 'Access Risks',
    value: '156',
    description: 'Permission issues',
    icon: ShieldAlert,
    iconColor: 'text-yellow-500',
    iconBg: 'bg-yellow-500/10',
  },
]

export default function IdentitiesOverviewPage() {
  return (
    <>
      <Main>
        <PageHeader title="Identities Overview" description="Human and non-human identities" />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {identityStats.map((stat) => (
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
