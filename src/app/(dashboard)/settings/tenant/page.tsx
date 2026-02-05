'use client'

import { useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Save,
  Building,
  Globe,
  Shield,
  Key,
  Copy,
  RefreshCw,
  Upload,
  Loader2,
  AlertCircle,
  Lock,
} from 'lucide-react'
import { usePermissions, Permission } from '@/lib/permissions'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import {
  useTenantSettings,
  useUpdateTenant,
  useUpdateGeneralSettings,
  useUpdateSecuritySettings,
  useUpdateAPISettings,
  useUpdateBrandingSettings,
  useTenantLogo,
  VALID_TIMEZONES,
  VALID_LANGUAGES,
  VALID_INDUSTRIES,
  SESSION_TIMEOUT_OPTIONS,
  WEBHOOK_EVENTS,
  type WebhookEvent,
} from '@/features/organization'

export default function TenantPage() {
  const { currentTenant, updateCurrentTenant, refreshTenants } = useTenant()
  const tenantId = currentTenant?.id

  // Permission check - can user update tenant settings?
  const { can } = usePermissions()
  const canUpdateTenant = can(Permission.TeamUpdate)

  // Fetch settings
  const { settings, isLoading, isError, error, mutate } = useTenantSettings(tenantId)

  // Update hooks
  const { updateTenant, isUpdating: isUpdatingTenant } = useUpdateTenant(tenantId)
  const { updateGeneralSettings, isUpdating: isUpdatingGeneral } =
    useUpdateGeneralSettings(tenantId)
  const { updateSecuritySettings, isUpdating: isUpdatingSecurity } =
    useUpdateSecuritySettings(tenantId)
  const { updateAPISettings, isUpdating: isUpdatingAPI } = useUpdateAPISettings(tenantId)
  const { updateBrandingSettings, isUpdating: isUpdatingBranding } =
    useUpdateBrandingSettings(tenantId)

  // Combined loading state (for potential future use in global loading indicator)
  const _isUpdating =
    isUpdatingTenant ||
    isUpdatingGeneral ||
    isUpdatingSecurity ||
    isUpdatingAPI ||
    isUpdatingBranding

  // Organization info form state (name, slug)
  const [orgInfoForm, setOrgInfoForm] = useState({
    name: '',
    slug: '',
  })
  const [_hasOrgInfoChanges, setHasOrgInfoChanges] = useState(false)

  // Cached logo hook
  const { logoSrc, updateLogo } = useTenantLogo(
    tenantId,
    settings?.branding.logo_data,
    currentTenant?.logo_url
  )

  // Local form state
  const [generalForm, setGeneralForm] = useState({
    timezone: 'UTC',
    language: 'en',
    industry: '',
    website: '',
  })

  const [securityForm, setSecurityForm] = useState({
    mfa_required: false,
    session_timeout_min: 60,
    ip_whitelist: '',
    allowed_domains: '',
  })

  const [apiForm, setApiForm] = useState({
    api_key_enabled: false,
    webhook_url: '',
    webhook_events: [] as WebhookEvent[],
  })

  const [brandingForm, setBrandingForm] = useState({
    primary_color: '#3B82F6',
    logo_dark_url: '',
    logo_data: null as string | null,
  })

  // Populate org info form when tenant loads - syncing with external data

  useEffect(() => {
    if (currentTenant) {
      setOrgInfoForm({
        name: currentTenant.name || '',
        slug: currentTenant.slug || '',
      })
      setHasOrgInfoChanges(false)
    }
  }, [currentTenant])

  // Populate settings form when settings load - syncing with external data

  useEffect(() => {
    if (settings) {
      setGeneralForm({
        timezone: settings.general.timezone || 'UTC',
        language: settings.general.language || 'en',
        industry: settings.general.industry || '',
        website: settings.general.website || '',
      })
      setSecurityForm({
        mfa_required: settings.security.mfa_required || false,
        session_timeout_min: settings.security.session_timeout_min || 60,
        ip_whitelist: (settings.security.ip_whitelist || []).join('\n'),
        allowed_domains: (settings.security.allowed_domains || []).join('\n'),
      })
      setApiForm({
        api_key_enabled: settings.api.api_key_enabled || false,
        webhook_url: settings.api.webhook_url || '',
        webhook_events: settings.api.webhook_events || [],
      })
      setBrandingForm({
        primary_color: settings.branding.primary_color || '#3B82F6',
        logo_dark_url: settings.branding.logo_dark_url || '',
        logo_data: settings.branding.logo_data || null,
      })
    }
  }, [settings])

  // Handle org info changes
  const handleOrgInfoChange = (field: 'name' | 'slug', value: string) => {
    // Validate slug format (lowercase letters, numbers, hyphens)
    if (field === 'slug') {
      value = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    }
    setOrgInfoForm((prev) => ({ ...prev, [field]: value }))
    const hasChanges =
      (field === 'name' ? value : orgInfoForm.name) !== currentTenant?.name ||
      (field === 'slug' ? value : orgInfoForm.slug) !== currentTenant?.slug
    setHasOrgInfoChanges(hasChanges)
  }

  // Save org info (kept for potential standalone use)
  const _handleSaveOrgInfo = async () => {
    try {
      const changes: { name?: string; slug?: string } = {}
      if (orgInfoForm.name !== currentTenant?.name) {
        changes.name = orgInfoForm.name
      }
      if (orgInfoForm.slug !== currentTenant?.slug) {
        changes.slug = orgInfoForm.slug
      }
      if (Object.keys(changes).length === 0) {
        return
      }
      const result = await updateTenant(changes)
      if (result) {
        // Update tenant context without reload
        updateCurrentTenant(changes)
        refreshTenants()
        toast.success('Organization info updated successfully')
        setHasOrgInfoChanges(false)
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update organization info'))
    }
  }

  // Save handlers - Combined save for General tab (org info + general settings)
  const handleSaveSettings = async () => {
    try {
      let hasChanges = false

      // Track org info changes
      const orgChanges: { name?: string; slug?: string } = {}
      if (orgInfoForm.name !== currentTenant?.name) {
        orgChanges.name = orgInfoForm.name
      }
      if (orgInfoForm.slug !== currentTenant?.slug) {
        orgChanges.slug = orgInfoForm.slug
      }

      // Track general settings changes
      const hasGeneralChanges =
        settings &&
        (generalForm.timezone !== (settings.general.timezone || 'UTC') ||
          generalForm.language !== (settings.general.language || 'en') ||
          generalForm.industry !== (settings.general.industry || '') ||
          generalForm.website !== (settings.general.website || ''))

      // Save org info if there are changes
      if (Object.keys(orgChanges).length > 0) {
        await updateTenant(orgChanges)
        // Update tenant context without reload
        updateCurrentTenant(orgChanges)
        // Refresh tenants list in background
        refreshTenants()
        hasChanges = true
        setHasOrgInfoChanges(false)
      }

      // Save general settings only if there are changes
      if (hasGeneralChanges) {
        const result = await updateGeneralSettings(generalForm)
        if (result) {
          mutate(result)
          hasChanges = true
        }
      }

      if (hasChanges) {
        toast.success('Settings saved successfully')
      } else {
        toast.info('No changes to save')
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save settings'))
    }
  }

  // Keep old handler for backwards compatibility
  const handleSaveGeneral = handleSaveSettings

  const handleSaveSecurity = async () => {
    try {
      const ipWhitelist = securityForm.ip_whitelist
        .split('\n')
        .map((ip) => ip.trim())
        .filter(Boolean)
      const allowedDomains = securityForm.allowed_domains
        .split('\n')
        .map((d) => d.trim())
        .filter(Boolean)

      const result = await updateSecuritySettings({
        mfa_required: securityForm.mfa_required,
        session_timeout_min: securityForm.session_timeout_min,
        ip_whitelist: ipWhitelist,
        allowed_domains: allowedDomains,
      })
      if (result) {
        mutate(result)
        toast.success('Security settings saved successfully')
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save security settings'))
    }
  }

  const handleSaveAPI = async () => {
    try {
      const result = await updateAPISettings({
        api_key_enabled: apiForm.api_key_enabled,
        webhook_url: apiForm.webhook_url,
        webhook_events: apiForm.webhook_events,
      })
      if (result) {
        mutate(result)
        toast.success('API settings saved successfully')
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save API settings'))
    }
  }

  const handleCopyApiKey = () => {
    // TODO: Implement actual API key display
    toast.info('API key feature coming soon')
  }

  const handleRegenerateApiKey = () => {
    toast.info('API key regeneration coming soon')
  }

  const handleTestWebhook = () => {
    toast.info('Webhook test coming soon')
  }

  const toggleWebhookEvent = (event: WebhookEvent) => {
    setApiForm((prev) => ({
      ...prev,
      webhook_events: prev.webhook_events.includes(event)
        ? prev.webhook_events.filter((e) => e !== event)
        : [...prev.webhook_events, event],
    }))
  }

  // Loading state
  if (isLoading) {
    return (
      <>
        <Main>
          <PageHeader
            title="Tenant Settings"
            description="Manage your organization settings and configuration"
          />
          <div className="mt-6 space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </Main>
      </>
    )
  }

  // Error state
  if (isError) {
    return (
      <>
        <Main>
          <PageHeader
            title="Tenant Settings"
            description="Manage your organization settings and configuration"
          />
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load settings: {error?.message || 'Unknown error'}
            </AlertDescription>
          </Alert>
        </Main>
      </>
    )
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Tenant Settings"
          description="Manage your organization settings and configuration"
        />

        <Tabs defaultValue="general" className="mt-6">
          <TabsList>
            <TabsTrigger value="general">
              <Building className="mr-2 h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="mr-2 h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="api">
              <Key className="mr-2 h-4 w-4" />
              API & Webhooks
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Organization Information
                </CardTitle>
                <CardDescription>Basic information about your organization</CardDescription>
              </CardHeader>
              <CardContent>
                {/* 2-Column Layout: Logo | Details */}
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left Column - Logo */}
                  <div className="flex flex-col items-center lg:items-start gap-3 lg:border-r lg:pr-8">
                    {/* Logo with Hover Upload */}
                    <div className="relative group">
                      <Avatar className="h-24 w-24 ring-2 ring-border">
                        <AvatarImage src={brandingForm.logo_data || logoSrc || undefined} />
                        <AvatarFallback className="text-3xl bg-primary/10">
                          {currentTenant?.name?.charAt(0) || 'T'}
                        </AvatarFallback>
                      </Avatar>
                      {canUpdateTenant ? (
                        <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                          <Upload className="h-6 w-6 text-white" />
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              const img = new Image()
                              const canvas = document.createElement('canvas')
                              const reader = new FileReader()
                              reader.onload = (ev) => {
                                img.onload = () => {
                                  const maxSize = 200
                                  let w = img.width,
                                    h = img.height
                                  if (w > maxSize) {
                                    h = (h * maxSize) / w
                                    w = maxSize
                                  }
                                  if (h > maxSize) {
                                    w = (w * maxSize) / h
                                    h = maxSize
                                  }
                                  canvas.width = w
                                  canvas.height = h
                                  const ctx = canvas.getContext('2d')
                                  ctx?.drawImage(img, 0, 0, w, h)
                                  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
                                  setBrandingForm({ ...brandingForm, logo_data: dataUrl })
                                }
                                img.src = ev.target?.result as string
                              }
                              reader.readAsDataURL(file)
                              e.target.value = ''
                            }}
                          />
                        </label>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-not-allowed transition-opacity">
                                <Lock className="h-6 w-6 text-white" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>You do not have permission to update logo</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>

                    {/* Logo Actions */}
                    <div className="flex flex-col items-center gap-2">
                      {brandingForm.logo_data ? (
                        <>
                          <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                            Unsaved changes
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBrandingForm({ ...brandingForm, logo_data: null })}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={async () => {
                                try {
                                  const result = await updateBrandingSettings({
                                    logo_data: brandingForm.logo_data,
                                  })
                                  if (result) {
                                    mutate(result)
                                    updateLogo(brandingForm.logo_data)
                                    toast.success('Logo updated')
                                  }
                                } catch {
                                  toast.error('Failed to update logo')
                                }
                              }}
                              disabled={isUpdatingBranding}
                            >
                              {isUpdatingBranding ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground text-center">
                            {canUpdateTenant ? (
                              <>
                                Hover to upload
                                <br />
                                Max 200x200px
                              </>
                            ) : (
                              <>
                                Logo upload disabled
                                <br />
                                Insufficient permissions
                              </>
                            )}
                          </p>
                          {(logoSrc || currentTenant?.logo_url) && canUpdateTenant && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-7 text-xs"
                              onClick={async () => {
                                try {
                                  const result = await updateBrandingSettings({ logo_data: null })
                                  if (result) {
                                    mutate(result)
                                    updateLogo(null)
                                    toast.success('Logo removed')
                                  }
                                } catch {
                                  toast.error('Failed to remove logo')
                                }
                              }}
                              disabled={isUpdatingBranding}
                            >
                              Remove
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Organization Details */}
                  <div className="flex-1 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Organization Name</Label>
                        <Input
                          id="name"
                          value={orgInfoForm.name}
                          onChange={(e) => handleOrgInfoChange('name', e.target.value)}
                          placeholder="My Organization"
                          disabled={!canUpdateTenant}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="slug">URL Slug</Label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 rounded-l-md">
                            app.rediver.io/
                          </span>
                          <Input
                            id="slug"
                            value={orgInfoForm.slug}
                            onChange={(e) => handleOrgInfoChange('slug', e.target.value)}
                            className="rounded-l-none"
                            placeholder="my-org"
                            disabled={!canUpdateTenant}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Lowercase letters, numbers, and hyphens only
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          type="url"
                          placeholder="https://example.com"
                          value={generalForm.website}
                          onChange={(e) =>
                            setGeneralForm({ ...generalForm, website: e.target.value })
                          }
                          disabled={!canUpdateTenant}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="industry">Industry</Label>
                        <Select
                          value={generalForm.industry}
                          onValueChange={(value) =>
                            setGeneralForm({ ...generalForm, industry: value })
                          }
                          disabled={!canUpdateTenant}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                          <SelectContent>
                            {VALID_INDUSTRIES.map((ind) => (
                              <SelectItem key={ind.value} value={ind.value}>
                                {ind.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Localization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Localization
                </CardTitle>
                <CardDescription>Language and timezone settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={generalForm.timezone}
                      onValueChange={(value) => setGeneralForm({ ...generalForm, timezone: value })}
                      disabled={!canUpdateTenant}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VALID_TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Default Language</Label>
                    <Select
                      value={generalForm.language}
                      onValueChange={(value) => setGeneralForm({ ...generalForm, language: value })}
                      disabled={!canUpdateTenant}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VALID_LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        onClick={handleSaveGeneral}
                        disabled={isUpdatingGeneral || !canUpdateTenant}
                      >
                        {isUpdatingGeneral ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : !canUpdateTenant ? (
                          <Lock className="mr-2 h-4 w-4" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Settings
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canUpdateTenant && (
                    <TooltipContent>
                      <p>You do not have permission to update tenant settings</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Authentication
                </CardTitle>
                <CardDescription>Configure authentication and access settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require MFA</Label>
                    <p className="text-sm text-muted-foreground">
                      All users must enable two-factor authentication
                    </p>
                  </div>
                  <Switch
                    checked={securityForm.mfa_required}
                    onCheckedChange={(checked) =>
                      setSecurityForm({ ...securityForm, mfa_required: checked })
                    }
                    disabled={!canUpdateTenant}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Session Timeout</Label>
                  <Select
                    value={String(securityForm.session_timeout_min)}
                    onValueChange={(value) =>
                      setSecurityForm({ ...securityForm, session_timeout_min: Number(value) })
                    }
                    disabled={!canUpdateTenant}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SESSION_TIMEOUT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* IP Restrictions */}
            <Card>
              <CardHeader>
                <CardTitle>IP Restrictions</CardTitle>
                <CardDescription>Limit access to specific IP addresses or ranges</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="ip-whitelist">Allowed IP Addresses</Label>
                  <Textarea
                    id="ip-whitelist"
                    placeholder="Enter IP addresses or CIDR ranges, one per line&#10;Example: 192.168.1.0/24"
                    value={securityForm.ip_whitelist}
                    onChange={(e) =>
                      setSecurityForm({ ...securityForm, ip_whitelist: e.target.value })
                    }
                    rows={4}
                    disabled={!canUpdateTenant}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to allow access from any IP address
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        onClick={handleSaveSecurity}
                        disabled={isUpdatingSecurity || !canUpdateTenant}
                      >
                        {isUpdatingSecurity ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : !canUpdateTenant ? (
                          <Lock className="mr-2 h-4 w-4" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Security Settings
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canUpdateTenant && (
                    <TooltipContent>
                      <p>You do not have permission to update tenant settings</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </TabsContent>

          {/* API Tab */}
          <TabsContent value="api" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Access
                </CardTitle>
                <CardDescription>Enable and manage API key access</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable API Access</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow programmatic access via API keys
                    </p>
                  </div>
                  <Switch
                    checked={apiForm.api_key_enabled}
                    onCheckedChange={(checked) =>
                      setApiForm({ ...apiForm, api_key_enabled: checked })
                    }
                    disabled={!canUpdateTenant}
                  />
                </div>

                {apiForm.api_key_enabled && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          value="rsec_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                          readOnly
                          className="font-mono"
                        />
                        <Button variant="outline" size="icon" onClick={handleCopyApiKey}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleRegenerateApiKey}
                          disabled={!canUpdateTenant}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Keep your API key secure. Do not share it publicly.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Webhook */}
            <Card>
              <CardHeader>
                <CardTitle>Webhook Configuration</CardTitle>
                <CardDescription>Receive real-time notifications for events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder="https://your-server.com/webhook"
                    value={apiForm.webhook_url}
                    onChange={(e) => setApiForm({ ...apiForm, webhook_url: e.target.value })}
                    disabled={!canUpdateTenant}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Events to Send</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {WEBHOOK_EVENTS.map((event) => (
                      <div key={event.value} className="flex items-center space-x-2">
                        <Switch
                          checked={apiForm.webhook_events.includes(event.value)}
                          onCheckedChange={() => toggleWebhookEvent(event.value)}
                          id={event.value}
                          disabled={!canUpdateTenant}
                        />
                        <Label htmlFor={event.value} className="font-mono text-sm cursor-pointer">
                          {event.value}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestWebhook}
                  disabled={!canUpdateTenant}
                >
                  Test Webhook
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button onClick={handleSaveAPI} disabled={isUpdatingAPI || !canUpdateTenant}>
                        {isUpdatingAPI ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : !canUpdateTenant ? (
                          <Lock className="mr-2 h-4 w-4" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save API Settings
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canUpdateTenant && (
                    <TooltipContent>
                      <p>You do not have permission to update tenant settings</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
