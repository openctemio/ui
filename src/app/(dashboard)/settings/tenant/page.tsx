'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useUrlFilter } from '@/hooks/use-url-param'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Save, Building, Shield, Key, Upload, Loader2, AlertCircle, Lock } from 'lucide-react'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import { get, patch } from '@/lib/api/client'
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

const STORAGE_FORM_ID = 'storage-config-form'

interface StorageStatus {
  canSave: boolean
  saving: boolean
}

/**
 * The storage tab owns its own fields; it renders them as a <form> so the page
 * header's Save button (the one Save every settings page has) can submit it via
 * `form={STORAGE_FORM_ID}`, and reports whether saving is possible.
 */
function StorageConfigTab({ onStatusChange }: { onStatusChange: (s: StorageStatus) => void }) {
  const [provider, setProvider] = useState('local')
  const [bucket, setBucket] = useState('')
  const [region, setRegion] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [accessKey, setAccessKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Load current config via API client (includes CSRF + auth)
  useEffect(() => {
    get('/api/v1/attachments/storage-config')
      .then((data: unknown) => {
        const d = data as Record<string, unknown> | null
        if (!d) {
          setLoaded(true)
          return
        }
        if (d?.configured) {
          setProvider((d.provider as string) || 'local')
          setBucket((d.bucket as string) || '')
          setRegion((d.region as string) || '')
          setEndpoint((d.endpoint as string) || '')
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await patch('/api/v1/attachments/storage-config', {
        provider,
        bucket,
        region,
        endpoint,
        access_key: accessKey,
        secret_key: secretKey,
      })
      toast.success('Storage configuration saved')
      setAccessKey('')
      setSecretKey('')
    } catch {
      toast.error('Failed to save storage configuration')
    } finally {
      setSaving(false)
    }
  }

  const isCloud = provider === 's3' || provider === 'minio'
  const canSave = loaded && !saving && !(isCloud && !bucket)

  useEffect(() => {
    onStatusChange({ canSave, saving })
  }, [canSave, saving, onStatusChange])

  if (!loaded) return <Skeleton className="h-48 w-full rounded-xl" />

  return (
    <form id={STORAGE_FORM_ID} onSubmit={handleSave}>
      <Card>
        <CardHeader>
          <CardTitle>Storage provider</CardTitle>
          <CardDescription>
            Choose where uploaded evidence and attachments are stored
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">
                  <span className="flex items-center gap-2">Local filesystem</span>
                </SelectItem>
                <SelectItem value="s3">Amazon S3</SelectItem>
                <SelectItem value="minio">MinIO (S3-compatible)</SelectItem>
              </SelectContent>
            </Select>
            {!isCloud && (
              <p className="text-sm text-muted-foreground">
                Files stored on the server disk at the default storage path.
              </p>
            )}
          </div>

          {isCloud && (
            <>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bucket name *</Label>
                  <Input
                    value={bucket}
                    onChange={(e) => setBucket(e.target.value)}
                    placeholder="my-pentest-evidence"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Input
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="ap-southeast-1"
                  />
                </div>
                {provider === 'minio' && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Endpoint *</Label>
                    <Input
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      placeholder="https://minio.internal:9000"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Access key</Label>
                  <Input
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="AKIA..."
                    type="password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to keep existing credentials
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Secret key</Label>
                  <Input
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="••••••••"
                    type="password"
                  />
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Existing files on local storage will remain accessible after switching. Each file
                  remembers which provider stores it.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>
    </form>
  )
}

const PAGE_TITLE = 'Tenant settings'
const PAGE_DESCRIPTION =
  "Manage your organization's profile, sign-in security, API access and file storage."
const TABS = ['general', 'security', 'api', 'storage'] as const

/**
 * The active tab's one Save, in the page header like every settings page. A
 * permission-locked Save stays visible (disabled, with a lock and the reason)
 * so the admin knows why nothing can be changed.
 */
function HeaderSaveButton({
  onClick,
  form,
  busy,
  disabled = false,
  locked = false,
  lockedReason,
}: {
  onClick?: () => void
  form?: string
  busy: boolean
  disabled?: boolean
  locked?: boolean
  lockedReason?: string
}) {
  const button = (
    <Button
      size="sm"
      type={form ? 'submit' : 'button'}
      form={form}
      onClick={onClick}
      disabled={busy || disabled || locked}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : locked ? (
        <Lock className="h-4 w-4" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      Save changes
    </Button>
  )
  if (!locked || !lockedReason) return button
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{button}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{lockedReason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default function TenantPage() {
  const [tabParam, setTabParam] = useUrlFilter('tab', 'general')
  const activeTab = (TABS as readonly string[]).includes(tabParam) ? tabParam : 'general'
  const setActiveTab = (next: string) => setTabParam(next === 'general' ? '' : next)
  const [storageStatus, setStorageStatus] = useState<StorageStatus>({
    canSave: false,
    saving: false,
  })
  const onStorageStatus = useCallback((st: StorageStatus) => setStorageStatus(st), [])

  const { currentTenant, updateCurrentTenant, refreshTenants } = useTenant()
  const tenantId = currentTenant?.id

  // Permission check - can user update tenant settings?
  const { can, isOwner } = usePermissions()
  const canUpdateTenant = can(Permission.TeamUpdate)
  // Security and API/webhook settings are owner-only on the backend
  // (RequireTeamOwner) — TeamUpdate alone renders a dead control for admins.
  const canManageSecurityAndAPI = canUpdateTenant && isOwner()

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
    email_verification_mode: 'auto' as 'auto' | 'always' | 'never',
    restricted_data_scope: false,
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
        email_verification_mode:
          (settings.security.email_verification_mode as 'auto' | 'always' | 'never') || 'auto',
        restricted_data_scope: settings.security.restricted_data_scope || false,
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
        email_verification_mode: securityForm.email_verification_mode,
        restricted_data_scope: securityForm.restricted_data_scope,
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
          <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
          <div className="mt-5 space-y-5">
            <Skeleton className="h-9 w-96 max-w-full" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
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
          <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
          <Alert variant="destructive" className="mt-5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load settings</AlertTitle>
            <AlertDescription>
              <p>{error?.message || 'Unknown error'}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => void mutate()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </Main>
      </>
    )
  }

  return (
    <>
      <Main>
        <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
          {activeTab === 'general' && (
            <HeaderSaveButton
              onClick={handleSaveGeneral}
              busy={isUpdatingGeneral}
              locked={!canUpdateTenant}
              lockedReason="You do not have permission to update tenant settings"
            />
          )}
          {activeTab === 'security' && (
            <HeaderSaveButton
              onClick={handleSaveSecurity}
              busy={isUpdatingSecurity}
              locked={!canManageSecurityAndAPI}
              lockedReason="Only the tenant owner can change these settings"
            />
          )}
          {activeTab === 'api' && (
            <HeaderSaveButton
              onClick={handleSaveAPI}
              busy={isUpdatingAPI}
              locked={!canManageSecurityAndAPI}
              lockedReason="Only the tenant owner can change these settings"
            />
          )}
          {activeTab === 'storage' && (
            <HeaderSaveButton
              form={STORAGE_FORM_ID}
              busy={storageStatus.saving}
              disabled={!storageStatus.canSave}
            />
          )}
        </PageHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="general">
              <Building className="me-2 h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="me-2 h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="api">
              <Key className="me-2 h-4 w-4" />
              API & Webhooks
            </TabsTrigger>
            <TabsTrigger value="storage">
              <Upload className="me-2 h-4 w-4" />
              File storage
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="mt-5 space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Organization information</CardTitle>
                <CardDescription>Basic information about your organization</CardDescription>
              </CardHeader>
              <CardContent>
                {/* 2-Column Layout: Logo | Details */}
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left Column - Logo */}
                  <div className="flex flex-col items-center lg:items-start gap-3 lg:border-r lg:pe-8">
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
                          <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
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
                                  // PATCH /settings/branding is a full-struct
                                  // replace — omitted fields reset to "". Echo
                                  // back primary_color/logo_dark_url so saving
                                  // the logo doesn't wipe them.
                                  const result = await updateBrandingSettings({
                                    primary_color: brandingForm.primary_color,
                                    logo_dark_url: brandingForm.logo_dark_url,
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
                              className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={async () => {
                                try {
                                  const result = await updateBrandingSettings({
                                    primary_color: brandingForm.primary_color,
                                    logo_dark_url: brandingForm.logo_dark_url,
                                    logo_data: null,
                                  })
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
                        <Label htmlFor="name">Organization name</Label>
                        <Input
                          id="name"
                          value={orgInfoForm.name}
                          onChange={(e) => handleOrgInfoChange('name', e.target.value)}
                          placeholder="My Organization"
                          disabled={!canUpdateTenant}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="slug">URL slug</Label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 rounded-l-md">
                            app.openctem.io/
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
                <CardTitle>Localization</CardTitle>
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
                    <Label htmlFor="language">Default language</Label>
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
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="mt-5 space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
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
                    disabled={!canManageSecurityAndAPI}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Restricted data scope</Label>
                    <p className="text-sm text-muted-foreground">
                      Non-admins see only the assets they&apos;re assigned (directly or via a team)
                      and their findings. When off, a user with no assignment sees everything.
                      Assign members to teams with their assets before turning this on, or
                      they&apos;ll see nothing.
                    </p>
                  </div>
                  <Switch
                    checked={securityForm.restricted_data_scope}
                    onCheckedChange={(checked) =>
                      setSecurityForm({ ...securityForm, restricted_data_scope: checked })
                    }
                    disabled={!canManageSecurityAndAPI}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Session timeout</Label>
                  <Select
                    value={String(securityForm.session_timeout_min)}
                    onValueChange={(value) =>
                      setSecurityForm({ ...securityForm, session_timeout_min: Number(value) })
                    }
                    disabled={!canManageSecurityAndAPI}
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

                <Separator />

                <div className="space-y-2">
                  <Label>Email verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Controls whether new users must verify their email address before login.
                  </p>
                  <Select
                    value={securityForm.email_verification_mode}
                    onValueChange={(value) =>
                      setSecurityForm({
                        ...securityForm,
                        email_verification_mode: value as 'auto' | 'always' | 'never',
                      })
                    }
                    disabled={!canManageSecurityAndAPI}
                  >
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Auto (Recommended)</span>
                          <span className="text-xs text-muted-foreground">
                            Require verification only when SMTP is configured
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="always">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Always require</span>
                          <span className="text-xs text-muted-foreground">
                            Force verification (SMTP must be configured to deliver emails)
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="never">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Never require</span>
                          <span className="text-xs text-muted-foreground">
                            Skip verification — users marked verified on registration. Use only for
                            closed/internal deployments.
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {securityForm.email_verification_mode === 'never' && (
                    <p className="mt-2 flex items-start gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>
                        Warning: anyone can register with any email address. This opens the door to
                        account hijacking via email spoofing. Only use on internal deployments where
                        registration is restricted by other means.
                      </span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* IP Restrictions */}
            <Card>
              <CardHeader>
                <CardTitle>IP restrictions</CardTitle>
                <CardDescription>Limit access to specific IP addresses or ranges</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="ip-whitelist">Allowed IP addresses</Label>
                  <Textarea
                    id="ip-whitelist"
                    placeholder="Enter IP addresses or CIDR ranges, one per line&#10;Example: 192.168.1.0/24"
                    value={securityForm.ip_whitelist}
                    onChange={(e) =>
                      setSecurityForm({ ...securityForm, ip_whitelist: e.target.value })
                    }
                    rows={4}
                    disabled={!canManageSecurityAndAPI}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to allow access from any IP address
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Tab */}
          <TabsContent value="api" className="mt-5 space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>API access</CardTitle>
                <CardDescription>Enable and manage API key access</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable API access</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow programmatic access via API keys
                    </p>
                  </div>
                  <Switch
                    checked={apiForm.api_key_enabled}
                    onCheckedChange={(checked) =>
                      setApiForm({ ...apiForm, api_key_enabled: checked })
                    }
                    disabled={!canManageSecurityAndAPI}
                  />
                </div>

                {apiForm.api_key_enabled && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>API key</Label>
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        API key generation and rotation are coming soon. Once available, you&apos;ll
                        be able to create and manage keys here.
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Webhook */}
            <Card>
              <CardHeader>
                <CardTitle>Webhook configuration</CardTitle>
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
                    disabled={!canManageSecurityAndAPI}
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
                          disabled={!canManageSecurityAndAPI}
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
                  disabled={!canManageSecurityAndAPI}
                >
                  Test webhook
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Storage Tab */}
          <TabsContent value="storage" className="mt-5 space-y-5">
            <StorageConfigTab onStatusChange={onStorageStatus} />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
