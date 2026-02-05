'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, GitBranch, Database, Globe, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import {
  useCreateTemplateSource,
  invalidateTemplateSourcesCache,
} from '@/lib/api/template-source-hooks'
import { useSecretStoreCredentials } from '@/lib/api/secret-store-hooks'
import {
  SOURCE_TYPE_DISPLAY_NAMES,
  SOURCE_TYPE_DESCRIPTIONS,
} from '@/lib/api/template-source-types'
import type { SourceType, CreateTemplateSourceRequest } from '@/lib/api/template-source-types'

// Form schema
const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  source_type: z.enum(['git', 's3', 'http']),
  template_type: z.enum(['nuclei', 'semgrep', 'gitleaks']),
  auto_sync_on_scan: z.boolean(),
  cache_ttl_minutes: z.number().min(5).max(1440),
  credential_id: z.string().optional(),
  // Git config
  git_url: z.string().optional(),
  git_branch: z.string().optional(),
  git_path: z.string().optional(),
  git_auth_type: z.enum(['none', 'ssh', 'token', 'oauth']).optional(),
  // S3 config
  s3_bucket: z.string().optional(),
  s3_region: z.string().optional(),
  s3_prefix: z.string().optional(),
  s3_auth_type: z.enum(['keys', 'sts_role']).optional(),
  s3_role_arn: z.string().optional(),
  s3_external_id: z.string().optional(),
  // HTTP config
  http_url: z.string().optional(),
  http_auth_type: z.enum(['none', 'bearer', 'basic', 'api_key']).optional(),
  http_timeout: z.number().optional(),
})

type FormData = z.infer<typeof formSchema>

interface AddTemplateSourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const SOURCE_TYPE_ICONS: Record<SourceType, React.ElementType> = {
  git: GitBranch,
  s3: Database,
  http: Globe,
}

const TEMPLATE_TYPE_OPTIONS = [
  { value: 'nuclei', label: 'Nuclei', description: 'YAML vulnerability templates' },
  { value: 'semgrep', label: 'Semgrep', description: 'YAML SAST rules' },
  { value: 'gitleaks', label: 'Gitleaks', description: 'TOML secret patterns' },
]

export function AddTemplateSourceDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddTemplateSourceDialogProps) {
  const [sourceType, setSourceType] = useState<SourceType>('git')

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      source_type: 'git',
      template_type: 'nuclei',
      auto_sync_on_scan: true,
      cache_ttl_minutes: 60,
      git_branch: 'main',
      git_path: '',
      git_auth_type: 'token',
      s3_auth_type: 'keys',
      http_auth_type: 'none',
      http_timeout: 30,
    },
  })

  const { trigger: createSource, isMutating } = useCreateTemplateSource()
  const { data: credentialsData } = useSecretStoreCredentials()
  const credentials = credentialsData?.items ?? []

  const onSubmit = async (data: FormData) => {
    const request: CreateTemplateSourceRequest = {
      name: data.name,
      source_type: data.source_type,
      template_type: data.template_type,
      description: data.description,
      auto_sync_on_scan: data.auto_sync_on_scan,
      cache_ttl_minutes: data.cache_ttl_minutes,
      credential_id: data.credential_id || undefined,
    }

    // Add source-specific config
    if (data.source_type === 'git' && data.git_url) {
      request.git_config = {
        url: data.git_url,
        branch: data.git_branch || 'main',
        path: data.git_path || '',
        auth_type: data.git_auth_type || 'none',
      }
    } else if (data.source_type === 's3' && data.s3_bucket) {
      request.s3_config = {
        bucket: data.s3_bucket,
        region: data.s3_region || 'us-east-1',
        prefix: data.s3_prefix || '',
        auth_type: data.s3_auth_type || 'keys',
        role_arn: data.s3_role_arn,
        external_id: data.s3_external_id,
      }
    } else if (data.source_type === 'http' && data.http_url) {
      request.http_config = {
        url: data.http_url,
        auth_type: data.http_auth_type || 'none',
        timeout: data.http_timeout,
      }
    }

    try {
      await createSource(request)
      toast.success(`Source "${data.name}" created`)
      await invalidateTemplateSourcesCache()
      form.reset()
      setSourceType('git')
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create source'))
    }
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset()
      setSourceType('git')
    }
    onOpenChange(isOpen)
  }

  const handleSourceTypeChange = (value: SourceType) => {
    setSourceType(value)
    form.setValue('source_type', value)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Template Source</DialogTitle>
          <DialogDescription>
            Configure an external source for custom scanner templates.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Company Security Templates" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Custom templates for internal vulnerability scanning"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="template_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TEMPLATE_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div>
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {option.description}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cache_ttl_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cache TTL (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={5}
                          max={1440}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                        />
                      </FormControl>
                      <FormDescription>
                        How long to cache before checking for updates
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Source Type Selection */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Source Type</h4>
              <Tabs
                value={sourceType}
                onValueChange={(v) => handleSourceTypeChange(v as SourceType)}
              >
                <TabsList className="grid w-full grid-cols-3">
                  {(['git', 's3', 'http'] as SourceType[]).map((type) => {
                    const Icon = SOURCE_TYPE_ICONS[type]
                    return (
                      <TabsTrigger key={type} value={type} className="gap-2">
                        <Icon className="h-4 w-4" />
                        {SOURCE_TYPE_DISPLAY_NAMES[type]}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                {/* Git Config */}
                <TabsContent value="git" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">{SOURCE_TYPE_DESCRIPTIONS.git}</p>
                  <FormField
                    control={form.control}
                    name="git_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repository URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://github.com/org/templates" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="git_branch"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Branch</FormLabel>
                          <FormControl>
                            <Input placeholder="main" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="git_path"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Path (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="templates/nuclei/" {...field} />
                          </FormControl>
                          <FormDescription>Subdirectory within the repo</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="git_auth_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Authentication</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select auth type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None (Public repo)</SelectItem>
                            <SelectItem value="token">Personal Access Token</SelectItem>
                            <SelectItem value="ssh">SSH Key</SelectItem>
                            <SelectItem value="oauth">OAuth</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* S3 Config */}
                <TabsContent value="s3" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">{SOURCE_TYPE_DESCRIPTIONS.s3}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="s3_bucket"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bucket Name</FormLabel>
                          <FormControl>
                            <Input placeholder="my-templates-bucket" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="s3_region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Region</FormLabel>
                          <FormControl>
                            <Input placeholder="us-east-1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="s3_prefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prefix (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="templates/nuclei/" {...field} />
                        </FormControl>
                        <FormDescription>Object key prefix to filter templates</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="s3_auth_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Authentication</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select auth type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="keys">Access Key / Secret Key</SelectItem>
                            <SelectItem value="sts_role">STS Assume Role</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch('s3_auth_type') === 'sts_role' && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="s3_role_arn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role ARN</FormLabel>
                            <FormControl>
                              <Input placeholder="arn:aws:iam::123456789:role/..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="s3_external_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>External ID (optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="external-id" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </TabsContent>

                {/* HTTP Config */}
                <TabsContent value="http" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">{SOURCE_TYPE_DESCRIPTIONS.http}</p>
                  <FormField
                    control={form.control}
                    name="http_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/templates.zip" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="http_auth_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Authentication</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select auth type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="bearer">Bearer Token</SelectItem>
                              <SelectItem value="basic">Basic Auth</SelectItem>
                              <SelectItem value="api_key">API Key</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="http_timeout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timeout (seconds)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={5}
                              max={300}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <Separator />

            {/* Credentials */}
            {(sourceType === 'git' && form.watch('git_auth_type') !== 'none') ||
            sourceType === 's3' ||
            (sourceType === 'http' && form.watch('http_auth_type') !== 'none') ? (
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Credentials
                </h4>
                <FormField
                  control={form.control}
                  name="credential_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Credential</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a stored credential" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {credentials.length === 0 ? (
                            <div className="p-2 text-center text-sm text-muted-foreground">
                              No credentials found. Create one in Secret Store.
                            </div>
                          ) : (
                            credentials.map((cred) => (
                              <SelectItem key={cred.id} value={cred.id}>
                                <div className="flex items-center gap-2">
                                  <span>{cred.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({cred.credential_type})
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select stored credentials for authentication
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            {/* Sync Settings */}
            <FormField
              control={form.control}
              name="auto_sync_on_scan"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Auto Sync on Scan</FormLabel>
                    <FormDescription>
                      Automatically check for updates when a scan uses this source
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isMutating}>
                {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Source
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
