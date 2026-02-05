'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Eye, EyeOff } from 'lucide-react'
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

import {
  useUpdateSecretStoreCredential,
  invalidateSecretStoreCache,
} from '@/lib/api/secret-store-hooks'
import { CREDENTIAL_TYPE_DISPLAY_NAMES } from '@/lib/api/secret-store-types'
import type {
  SecretStoreCredential,
  UpdateSecretStoreCredentialRequest,
} from '@/lib/api/secret-store-types'

// Form schema - matches all credential types
const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  expires_at: z.string().optional(),
  // API Key
  api_key_value: z.string().optional(),
  // Basic Auth
  basic_username: z.string().optional(),
  basic_password: z.string().optional(),
  // Bearer Token
  bearer_token: z.string().optional(),
  // SSH Key
  ssh_private_key: z.string().optional(),
  ssh_passphrase: z.string().optional(),
  // AWS Role
  aws_role_arn: z.string().optional(),
  aws_external_id: z.string().optional(),
  // GCP Service Account
  gcp_json_key: z.string().optional(),
  // Azure Service Principal
  azure_tenant_id: z.string().optional(),
  azure_client_id: z.string().optional(),
  azure_client_secret: z.string().optional(),
  // GitHub App
  github_app_id: z.string().optional(),
  github_installation_id: z.string().optional(),
  github_private_key: z.string().optional(),
  // GitLab Token
  gitlab_token: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface EditCredentialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  credential: SecretStoreCredential
  onSuccess?: () => void
}

export function EditCredentialDialog({
  open,
  onOpenChange,
  credential,
  onSuccess,
}: EditCredentialDialogProps) {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  const { trigger: updateCredential, isMutating } = useUpdateSecretStoreCredential(credential.id)

  // Reset form when credential changes
  useEffect(() => {
    if (credential && open) {
      form.reset({
        name: credential.name,
        description: credential.description || '',
        expires_at: credential.expires_at ? credential.expires_at.split('T')[0] : '',
        // Note: We don't populate secret values for security reasons
        // Users must re-enter them to update
      })
    }
  }, [credential, open, form])

  const toggleShowSecret = (field: string) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const onSubmit = async (data: FormData) => {
    const request: UpdateSecretStoreCredentialRequest = {
      name: data.name,
      description: data.description,
      expires_at: data.expires_at || undefined,
    }

    // Add credential-specific data based on type
    switch (credential.credential_type) {
      case 'api_key':
        if (data.api_key_value) {
          request.api_key = { key: data.api_key_value }
        }
        break
      case 'basic_auth':
        if (data.basic_username || data.basic_password) {
          request.basic_auth = {
            username: data.basic_username || '',
            password: data.basic_password || '',
          }
        }
        break
      case 'bearer_token':
        if (data.bearer_token) {
          request.bearer_token = { token: data.bearer_token }
        }
        break
      case 'ssh_key':
        if (data.ssh_private_key) {
          request.ssh_key = {
            private_key: data.ssh_private_key,
            passphrase: data.ssh_passphrase || undefined,
          }
        }
        break
      case 'aws_role':
        if (data.aws_role_arn) {
          request.aws_role = {
            role_arn: data.aws_role_arn,
            external_id: data.aws_external_id || undefined,
          }
        }
        break
      case 'gcp_service_account':
        if (data.gcp_json_key) {
          request.gcp_service_account = { json_key: data.gcp_json_key }
        }
        break
      case 'azure_service_principal':
        if (data.azure_tenant_id || data.azure_client_id || data.azure_client_secret) {
          request.azure_service_principal = {
            tenant_id: data.azure_tenant_id || '',
            client_id: data.azure_client_id || '',
            client_secret: data.azure_client_secret || '',
          }
        }
        break
      case 'github_app':
        if (data.github_app_id || data.github_installation_id || data.github_private_key) {
          request.github_app = {
            app_id: data.github_app_id || '',
            installation_id: data.github_installation_id || '',
            private_key: data.github_private_key || '',
          }
        }
        break
      case 'gitlab_token':
        if (data.gitlab_token) {
          request.gitlab_token = { token: data.gitlab_token }
        }
        break
    }

    try {
      await updateCredential(request)
      toast.success(`Credential "${data.name}" updated`)
      await invalidateSecretStoreCache()
      setShowSecrets({})
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update credential'))
    }
  }

  const renderCredentialFields = () => {
    switch (credential.credential_type) {
      case 'bearer_token':
        return (
          <FormField
            control={form.control}
            name="bearer_token"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Token</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showSecrets.bearer_token ? 'text' : 'password'}
                      placeholder="Enter new token to update"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => toggleShowSecret('bearer_token')}
                    >
                      {showSecrets.bearer_token ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'ssh_key':
        return (
          <>
            <FormField
              control={form.control}
              name="ssh_private_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Private Key</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter new private key to update"
                      className="font-mono text-xs"
                      rows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ssh_passphrase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Passphrase (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter new passphrase to update"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )

      case 'api_key':
        return (
          <FormField
            control={form.control}
            name="api_key_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API Key</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showSecrets.api_key ? 'text' : 'password'}
                      placeholder="Enter new API key to update"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => toggleShowSecret('api_key')}
                    >
                      {showSecrets.api_key ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'basic_auth':
        return (
          <>
            <FormField
              control={form.control}
              name="basic_username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter new username to update" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="basic_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showSecrets.basic_password ? 'text' : 'password'}
                        placeholder="Enter new password to update"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => toggleShowSecret('basic_password')}
                      >
                        {showSecrets.basic_password ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )

      case 'aws_role':
        return (
          <>
            <FormField
              control={form.control}
              name="aws_role_arn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role ARN</FormLabel>
                  <FormControl>
                    <Input placeholder="arn:aws:iam::123456789012:role/MyRole" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="aws_external_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External ID (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="External ID for cross-account access" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )

      case 'gcp_service_account':
        return (
          <FormField
            control={form.control}
            name="gcp_json_key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Account JSON Key</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='{"type": "service_account", ...}'
                    className="font-mono text-xs"
                    rows={6}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'azure_service_principal':
        return (
          <>
            <FormField
              control={form.control}
              name="azure_tenant_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant ID</FormLabel>
                  <FormControl>
                    <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="azure_client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Application (client) ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="azure_client_secret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Secret</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showSecrets.azure_secret ? 'text' : 'password'}
                        placeholder="Enter new client secret to update"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => toggleShowSecret('azure_secret')}
                      >
                        {showSecrets.azure_secret ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )

      case 'github_app':
        return (
          <>
            <FormField
              control={form.control}
              name="github_app_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App ID</FormLabel>
                  <FormControl>
                    <Input placeholder="123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="github_installation_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Installation ID</FormLabel>
                  <FormControl>
                    <Input placeholder="12345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="github_private_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Private Key</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="-----BEGIN RSA PRIVATE KEY-----"
                      className="font-mono text-xs"
                      rows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )

      case 'gitlab_token':
        return (
          <FormField
            control={form.control}
            name="gitlab_token"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GitLab Token</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showSecrets.gitlab_token ? 'text' : 'password'}
                      placeholder="Enter new token to update"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => toggleShowSecret('gitlab_token')}
                    >
                      {showSecrets.gitlab_token ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Credential</DialogTitle>
          <DialogDescription>
            Update the credential configuration. Leave secret fields empty to keep existing values.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline">
            {CREDENTIAL_TYPE_DISPLAY_NAMES[credential.credential_type]}
          </Badge>
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
                      <Input placeholder="Credential name" {...field} />
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
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what this credential is used for"
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
                name="expires_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Credential-specific fields */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">
                Update {CREDENTIAL_TYPE_DISPLAY_NAMES[credential.credential_type]}
              </h4>

              <Alert>
                <AlertDescription>
                  Leave fields empty to keep the current values. Enter new values to update.
                </AlertDescription>
              </Alert>

              {renderCredentialFields()}
            </div>

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
