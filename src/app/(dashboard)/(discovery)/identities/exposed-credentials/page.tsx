'use client'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { KeyRound, FileCode, FileText, Globe } from 'lucide-react'

// Mock stats data
const exposedCredentialStats = [
  {
    title: 'Total Exposed',
    value: '23',
    description: 'Credentials found at risk',
    icon: KeyRound,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-500/10',
  },
  {
    title: 'In Code',
    value: '12',
    description: 'Hardcoded in repositories',
    icon: FileCode,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-500/10',
  },
  {
    title: 'In Logs',
    value: '6',
    description: 'Found in log files',
    icon: FileText,
    iconColor: 'text-yellow-500',
    iconBg: 'bg-yellow-500/10',
  },
  {
    title: 'In Breaches',
    value: '5',
    description: 'Found in data breaches',
    icon: Globe,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-500/10',
  },
]

export default function ExposedCredentialsPage() {
  return (
    <>
      <Main>
        <PageHeader
          title="Exposed Credentials"
          description="Credentials found in code, logs, or breaches"
        />

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {exposedCredentialStats.map((stat) => (
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
