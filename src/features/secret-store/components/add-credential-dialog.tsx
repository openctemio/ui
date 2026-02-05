'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Eye, EyeOff, GitBranch, Cloud, Lock, Key, Terminal } from 'lucide-react'
import { toast } from 'sonner'

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
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import {
  useCreateSecretStoreCredential,
  invalidateSecretStoreCache,
} from '@/lib/api/secret-store-hooks'
import {
  CREDENTIAL_TYPE_DISPLAY_NAMES,
  CREDENTIAL_TYPE_DESCRIPTIONS,
  CREDENTIAL_TYPES,
} from '@/lib/api/secret-store-types'
import type {
  CredentialType,
  CreateSecretStoreCredentialRequest,
} from '@/lib/api/secret-store-types'
import { getErrorMessage } from '@/lib/api/error-handler'

// Form schema - matches backend credential types
const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  credential_type: z.enum(CREDENTIAL_TYPES, { message: 'Credential type is required' }),
  expires_at: z.string().optional(),
  // API Key
  api_key_value: z.string().optional(),
  // Basic Auth
  basic_username: z.string().optional(),
  basic_password: z.string().optional(),
  // Bearer Token (for Git tokens, etc.)
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

interface AddCredentialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const CREDENTIAL_TYPE_ICONS: Record<CredentialType, React.ElementType> = {
  api_key: Key,
  basic_auth: Lock,
  bearer_token: GitBranch,
  ssh_key: Terminal,
  aws_role: Cloud,
  gcp_service_account: Cloud,
  azure_service_principal: Cloud,
  github_app: GitBranch,
  gitlab_token: GitBranch,
}

export function AddCredentialDialog({ open, onOpenChange, onSuccess }: AddCredentialDialogProps) {
  const [credentialType, setCredentialType] = useState<CredentialType>('bearer_token')
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      credential_type: 'bearer_token',
    },
  })

  const { trigger: createCredential, isMutating } = useCreateSecretStoreCredential()

  const toggleShowSecret = (field: string) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const onSubmit = async (data: FormData) => {
    // Build request with flat credential data structure (matching backend)
    const request: CreateSecretStoreCredentialRequest = {
      name: data.name,
      description: data.description || undefined,
      credential_type: data.credential_type,
      expires_at: data.expires_at || undefined,
    }

    // Add credential-specific data as flat fields
    switch (data.credential_type) {
      case 'api_key':
        request.api_key = { key: data.api_key_value || '' }
        break
      case 'basic_auth':
        request.basic_auth = {
          username: data.basic_username || '',
          password: data.basic_password || '',
        }
        break
      case 'bearer_token':
        request.bearer_token = { token: data.bearer_token || '' }
        break
      case 'ssh_key':
        request.ssh_key = {
          private_key: data.ssh_private_key || '',
          passphrase: data.ssh_passphrase || undefined,
        }
        break
      case 'aws_role':
        request.aws_role = {
          role_arn: data.aws_role_arn || '',
          external_id: data.aws_external_id || undefined,
        }
        break
      case 'gcp_service_account':
        request.gcp_service_account = { json_key: data.gcp_json_key || '' }
        break
      case 'azure_service_principal':
        request.azure_service_principal = {
          tenant_id: data.azure_tenant_id || '',
          client_id: data.azure_client_id || '',
          client_secret: data.azure_client_secret || '',
        }
        break
      case 'github_app':
        request.github_app = {
          app_id: data.github_app_id || '',
          installation_id: data.github_installation_id || '',
          private_key: data.github_private_key || '',
        }
        break
      case 'gitlab_token':
        request.gitlab_token = { token: data.gitlab_token || '' }
        break
    }

    try {
      await createCredential(request)
      toast.success(`Credential "${data.name}" created`)
      await invalidateSecretStoreCache()
      form.reset()
      setCredentialType('bearer_token')
      setShowSecrets({})
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create credential'))
    }
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset()
      setCredentialType('bearer_token')
      setShowSecrets({})
    }
    onOpenChange(isOpen)
  }

  const handleCredentialTypeChange = (value: CredentialType) => {
    setCredentialType(value)
    form.setValue('credential_type', value)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Credential</DialogTitle>
          <DialogDescription>
            Securely store authentication credentials for template sources.
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
                      <Input placeholder="GitHub Personal Access Token" {...field} />
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
                        placeholder="Used for accessing company template repositories"
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
                    <FormDescription>
                      Set an expiration date to receive reminders before the credential expires
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Credential Type Selection */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Credential Type</h4>
              <Tabs
                value={credentialType}
                onValueChange={(v) => handleCredentialTypeChange(v as CredentialType)}
              >
                <TabsList className="grid w-full grid-cols-5">
                  {CREDENTIAL_TYPES.map((type) => {
                    const Icon = CREDENTIAL_TYPE_ICONS[type]
                    return (
                      <TabsTrigger key={type} value={type} className="text-xs">
                        <Icon className="mr-1 h-3 w-3" />
                        {CREDENTIAL_TYPE_DISPLAY_NAMES[type].split(' ')[0]}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                {/* Bearer Token (Git PAT, etc.) */}
                <TabsContent value="bearer_token" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    {CREDENTIAL_TYPE_DESCRIPTIONS.bearer_token}
                  </p>
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
                              placeholder="ghp_xxxxxxxxxxxx or glpat-xxxxxxxxxxxx"
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
                        <FormDescription>
                          Personal access token for GitHub, GitLab, Bitbucket, etc.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* SSH Key */}
                <TabsContent value="ssh_key" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    {CREDENTIAL_TYPE_DESCRIPTIONS.ssh_key}
                  </p>
                  <FormField
                    control={form.control}
                    name="ssh_private_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Private Key</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                            className="font-mono text-xs"
                            rows={6}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Paste your SSH private key (RSA, ED25519, etc.)
                        </FormDescription>
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
                          <Input type="password" placeholder="Key passphrase" {...field} />
                        </FormControl>
                        <FormDescription>Only required if your key is encrypted</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* API Key */}
                <TabsContent value="api_key" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    {CREDENTIAL_TYPE_DESCRIPTIONS.api_key}
                  </p>
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
                              placeholder="your-api-key"
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
                </TabsContent>

                {/* Basic Auth */}
                <TabsContent value="basic_auth" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    {CREDENTIAL_TYPE_DESCRIPTIONS.basic_auth}
                  </p>
                  <FormField
                    control={form.control}
                    name="basic_username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="username" {...field} />
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
                              placeholder="password"
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
                </TabsContent>

                {/* AWS Role */}
                <TabsContent value="aws_role" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    {CREDENTIAL_TYPE_DESCRIPTIONS.aws_role}
                  </p>
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
                        <FormDescription>
                          Required if the role has an external ID condition
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
            </div>

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
                Create Credential
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
