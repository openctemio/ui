'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, KeyRound } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'

import {
  useUpdateTemplateSource,
  invalidateTemplateSourcesCache,
} from '@/lib/api/template-source-hooks'
import { useSecretStoreCredentials } from '@/lib/api/secret-store-hooks'
import { SOURCE_TYPE_DISPLAY_NAMES } from '@/lib/api/template-source-types'
import type { TemplateSource, UpdateTemplateSourceRequest } from '@/lib/api/template-source-types'

// Form schema
const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
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

interface EditTemplateSourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: TemplateSource
  onSuccess?: () => void
}

export function EditTemplateSourceDialog({
  open,
  onOpenChange,
  source,
  onSuccess,
}: EditTemplateSourceDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      auto_sync_on_scan: true,
      cache_ttl_minutes: 60,
    },
  })

  const { trigger: updateSource, isMutating } = useUpdateTemplateSource(source.id)
  const { data: credentialsData } = useSecretStoreCredentials()
  const credentials = credentialsData?.items ?? []

  // Reset form when source changes
  useEffect(() => {
    if (source && open) {
      form.reset({
        name: source.name,
        description: source.description || '',
        auto_sync_on_scan: source.auto_sync_on_scan,
        cache_ttl_minutes: source.cache_ttl_minutes,
        credential_id: source.credential_id || '',
        // Git config
        git_url: source.git_config?.url || '',
        git_branch: source.git_config?.branch || 'main',
        git_path: source.git_config?.path || '',
        git_auth_type: source.git_config?.auth_type || 'none',
        // S3 config
        s3_bucket: source.s3_config?.bucket || '',
        s3_region: source.s3_config?.region || 'us-east-1',
        s3_prefix: source.s3_config?.prefix || '',
        s3_auth_type: source.s3_config?.auth_type || 'keys',
        s3_role_arn: source.s3_config?.role_arn || '',
        s3_external_id: source.s3_config?.external_id || '',
        // HTTP config
        http_url: source.http_config?.url || '',
        http_auth_type: source.http_config?.auth_type || 'none',
        http_timeout: source.http_config?.timeout || 30,
      })
    }
  }, [source, open, form])

  const onSubmit = async (data: FormData) => {
    const request: UpdateTemplateSourceRequest = {
      name: data.name,
      description: data.description,
      auto_sync_on_scan: data.auto_sync_on_scan,
      cache_ttl_minutes: data.cache_ttl_minutes,
      credential_id: data.credential_id || undefined,
    }

    // Add source-specific config based on source type
    if (source.source_type === 'git' && data.git_url) {
      request.git_config = {
        url: data.git_url,
        branch: data.git_branch || 'main',
        path: data.git_path || '',
        auth_type: data.git_auth_type || 'none',
      }
    } else if (source.source_type === 's3' && data.s3_bucket) {
      request.s3_config = {
        bucket: data.s3_bucket,
        region: data.s3_region || 'us-east-1',
        prefix: data.s3_prefix || '',
        auth_type: data.s3_auth_type || 'keys',
        role_arn: data.s3_role_arn,
        external_id: data.s3_external_id,
      }
    } else if (source.source_type === 'http' && data.http_url) {
      request.http_config = {
        url: data.http_url,
        auth_type: data.http_auth_type || 'none',
        timeout: data.http_timeout,
      }
    }

    try {
      await updateSource(request)
      toast.success(`Source "${data.name}" updated`)
      await invalidateTemplateSourcesCache()
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update source'))
    }
  }

  const needsCredentials =
    (source.source_type === 'git' && form.watch('git_auth_type') !== 'none') ||
    source.source_type === 's3' ||
    (source.source_type === 'http' && form.watch('http_auth_type') !== 'none')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Template Source</DialogTitle>
          <DialogDescription>Update the configuration for this template source.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline">{SOURCE_TYPE_DISPLAY_NAMES[source.source_type]}</Badge>
          <Badge variant="secondary">{source.template_type}</Badge>
        </div>

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
                    <FormDescription>How long to cache before checking for updates</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Source-specific config */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">
                {SOURCE_TYPE_DISPLAY_NAMES[source.source_type]} Configuration
              </h4>

              {source.source_type === 'git' && (
                <>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                </>
              )}

              {source.source_type === 's3' && (
                <>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                </>
              )}

              {source.source_type === 'http' && (
                <>
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
                </>
              )}
            </div>

            {/* Credentials */}
            {needsCredentials && (
              <>
                <Separator />
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
                            <SelectItem value="">None</SelectItem>
                            {credentials.map((cred) => (
                              <SelectItem key={cred.id} value={cred.id}>
                                <div className="flex items-center gap-2">
                                  <span>{cred.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({cred.credential_type})
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {source.credential_name && (
                          <FormDescription>
                            Currently using: {source.credential_name}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <Separator />

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
                onClick={() => onOpenChange(false)}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isMutating}>
                {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
