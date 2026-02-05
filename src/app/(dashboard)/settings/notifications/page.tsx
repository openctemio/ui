'use client'

import { useState } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Bell, Mail, MessageSquare, AlertTriangle, Save } from 'lucide-react'
import { toast } from 'sonner'

interface NotificationChannel {
  id: string
  name: string
  icon: typeof Bell
  enabled: boolean
}

interface NotificationType {
  id: string
  name: string
  description: string
  email: boolean
  inApp: boolean
  slack: boolean
  severity: 'all' | 'critical' | 'high' | 'medium'
}

export default function NotificationsSettingsPage() {
  const [isLoading, setIsLoading] = useState(false)

  const [channels, setChannels] = useState<NotificationChannel[]>([
    { id: 'email', name: 'Email', icon: Mail, enabled: true },
    { id: 'in-app', name: 'In-App Notifications', icon: Bell, enabled: true },
    { id: 'slack', name: 'Slack', icon: MessageSquare, enabled: false },
  ])

  const [notifications, setNotifications] = useState<NotificationType[]>([
    {
      id: 'new-finding',
      name: 'New Findings',
      description: 'When new security findings are discovered',
      email: true,
      inApp: true,
      slack: false,
      severity: 'high',
    },
    {
      id: 'critical-vuln',
      name: 'Critical Vulnerabilities',
      description: 'When critical vulnerabilities are detected',
      email: true,
      inApp: true,
      slack: true,
      severity: 'critical',
    },
    {
      id: 'scan-complete',
      name: 'Scan Completed',
      description: 'When security scans finish running',
      email: false,
      inApp: true,
      slack: false,
      severity: 'all',
    },
    {
      id: 'remediation-due',
      name: 'Remediation Due',
      description: 'When remediation tasks are approaching deadline',
      email: true,
      inApp: true,
      slack: false,
      severity: 'all',
    },
    {
      id: 'cisa-kev',
      name: 'CISA KEV Alerts',
      description: 'When components match CISA KEV catalog',
      email: true,
      inApp: true,
      slack: true,
      severity: 'critical',
    },
  ])

  const [digestFrequency, setDigestFrequency] = useState('daily')

  const toggleChannel = (channelId: string) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === channelId ? { ...ch, enabled: !ch.enabled } : ch))
    )
  }

  const toggleNotification = (notificationId: string, channel: 'email' | 'inApp' | 'slack') => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, [channel]: !n[channel] } : n))
    )
  }

  const updateSeverity = (
    notificationId: string,
    severity: 'all' | 'critical' | 'high' | 'medium'
  ) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, severity } : n)))
  }

  const handleSave = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)
    toast.success('Notification preferences saved')
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Notification Settings"
          description="Configure how and when you receive notifications"
        >
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </PageHeader>

        <div className="mt-6 grid gap-6">
          {/* Notification Channels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Channels
              </CardTitle>
              <CardDescription>Enable or disable notification delivery methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {channels.map((channel) => {
                const Icon = channel.icon
                return (
                  <div key={channel.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <Label className="text-base">{channel.name}</Label>
                        <p className="text-sm text-muted-foreground">
                          {channel.enabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={channel.enabled}
                      onCheckedChange={() => toggleChannel(channel.id)}
                    />
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Digest Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Digest
              </CardTitle>
              <CardDescription>Receive a summary of security events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Digest Frequency</Label>
                  <p className="text-sm text-muted-foreground">
                    How often to receive email summaries
                  </p>
                </div>
                <Select value={digestFrequency} onValueChange={setDigestFrequency}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notification Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Notification Types
              </CardTitle>
              <CardDescription>Configure which events trigger notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {notifications.map((notification, index) => (
                  <div key={notification.id}>
                    {index > 0 && <Separator className="mb-6" />}
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <Label className="text-base">{notification.name}</Label>
                          <p className="text-sm text-muted-foreground">
                            {notification.description}
                          </p>
                        </div>
                        <Select
                          value={notification.severity}
                          onValueChange={(value) =>
                            updateSeverity(
                              notification.id,
                              value as 'all' | 'critical' | 'high' | 'medium'
                            )
                          }
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Severities</SelectItem>
                            <SelectItem value="critical">Critical Only</SelectItem>
                            <SelectItem value="high">High & Above</SelectItem>
                            <SelectItem value="medium">Medium & Above</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <Switch
                            id={`${notification.id}-email`}
                            checked={notification.email}
                            onCheckedChange={() => toggleNotification(notification.id, 'email')}
                            disabled={!channels.find((c) => c.id === 'email')?.enabled}
                          />
                          <Label htmlFor={`${notification.id}-email`} className="text-sm">
                            Email
                          </Label>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Switch
                            id={`${notification.id}-inapp`}
                            checked={notification.inApp}
                            onCheckedChange={() => toggleNotification(notification.id, 'inApp')}
                            disabled={!channels.find((c) => c.id === 'in-app')?.enabled}
                          />
                          <Label htmlFor={`${notification.id}-inapp`} className="text-sm">
                            In-App
                          </Label>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Switch
                            id={`${notification.id}-slack`}
                            checked={notification.slack}
                            onCheckedChange={() => toggleNotification(notification.id, 'slack')}
                            disabled={!channels.find((c) => c.id === 'slack')?.enabled}
                          />
                          <Label htmlFor={`${notification.id}-slack`} className="text-sm">
                            Slack
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
