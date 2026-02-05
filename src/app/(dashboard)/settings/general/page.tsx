'use client'

import { useState } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Settings, Globe, Clock, Calendar, Save, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

export default function GeneralSettingsPage() {
  const [isLoading, setIsLoading] = useState(false)

  // Settings state
  const [settings, setSettings] = useState({
    platformName: 'Rediver Security Platform',
    timezone: 'Asia/Ho_Chi_Minh',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    language: 'en',
    autoRefresh: true,
    refreshInterval: '60',
    showWelcome: true,
    compactMode: false,
  })

  const handleSave = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)
    toast.success('Settings saved successfully')
  }

  const handleReset = () => {
    setSettings({
      platformName: 'Rediver Security Platform',
      timezone: 'Asia/Ho_Chi_Minh',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      language: 'en',
      autoRefresh: true,
      refreshInterval: '60',
      showWelcome: true,
      compactMode: false,
    })
    toast.info('Settings reset to defaults')
  }

  return (
    <>
      <Main>
        <PageHeader
          title="General Settings"
          description="Configure general platform settings and preferences"
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </PageHeader>

        <div className="mt-6 grid gap-6">
          {/* Platform Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Platform Settings
              </CardTitle>
              <CardDescription>Basic platform configuration options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platformName">Platform Name</Label>
                <Input
                  id="platformName"
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  This name appears in the sidebar and reports
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Welcome Screen</Label>
                  <p className="text-sm text-muted-foreground">
                    Display welcome message for new users
                  </p>
                </div>
                <Switch
                  checked={settings.showWelcome}
                  onCheckedChange={(checked) => setSettings({ ...settings, showWelcome: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use compact layout for tables and lists
                  </p>
                </div>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={(checked) => setSettings({ ...settings, compactMode: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Localization Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Localization
              </CardTitle>
              <CardDescription>Language, timezone, and format settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value) => setSettings({ ...settings, language: value })}
                  >
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="vi">Tieng Viet</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Ho_Chi_Minh">Asia/Ho Chi Minh (UTC+7)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</SelectItem>
                      <SelectItem value="America/New_York">America/New York (UTC-5)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dateFormat" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date Format
                  </Label>
                  <Select
                    value={settings.dateFormat}
                    onValueChange={(value) => setSettings({ ...settings, dateFormat: value })}
                  >
                    <SelectTrigger id="dateFormat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeFormat" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time Format
                  </Label>
                  <Select
                    value={settings.timeFormat}
                    onValueChange={(value) => setSettings({ ...settings, timeFormat: value })}
                  >
                    <SelectTrigger id="timeFormat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24-hour (14:30)</SelectItem>
                      <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto Refresh Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Data Refresh
              </CardTitle>
              <CardDescription>Configure automatic data refresh behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Refresh</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically refresh dashboard and data tables
                  </p>
                </div>
                <Switch
                  checked={settings.autoRefresh}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoRefresh: checked })}
                />
              </div>

              {settings.autoRefresh && (
                <div className="space-y-2">
                  <Label htmlFor="refreshInterval">Refresh Interval</Label>
                  <Select
                    value={settings.refreshInterval}
                    onValueChange={(value) => setSettings({ ...settings, refreshInterval: value })}
                  >
                    <SelectTrigger id="refreshInterval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                      <SelectItem value="600">10 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
