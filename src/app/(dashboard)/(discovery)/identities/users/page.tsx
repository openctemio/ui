'use client'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, UserX, Shield } from 'lucide-react'

// Mock stats data
const userStats = [
  {
    title: 'Total Users',
    value: '1,247',
    description: 'All human user accounts',
    icon: Users,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-500/10',
  },
  {
    title: 'Active Users',
    value: '1,089',
    description: 'Users active in last 30 days',
    icon: UserCheck,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-500/10',
  },
  {
    title: 'Inactive Users',
    value: '158',
    description: 'No activity in 30+ days',
    icon: UserX,
    iconColor: 'text-gray-500',
    iconBg: 'bg-gray-500/10',
  },
  {
    title: 'Privileged Users',
    value: '47',
    description: 'Users with elevated access',
    icon: Shield,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-500/10',
  },
]

export default function UsersPage() {
  return (
    <>
      <Main>
        <PageHeader title="Users" description="Human user accounts" />

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {userStats.map((stat) => (
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
