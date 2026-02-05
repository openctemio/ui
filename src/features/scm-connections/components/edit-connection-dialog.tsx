'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Settings, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

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

import { ProviderIcon } from './provider-icon'
import type { Integration } from '@/features/integrations'
import type { SCMConnection } from '@/features/repositories/types/repository.types'
import { SCM_PROVIDER_LABELS } from '@/features/assets/types/asset.types'
import {
  useUpdateIntegrationApi,
  useTestIntegrationApi,
  invalidateSCMIntegrationsCache,
} from '@/features/integrations'
import { getErrorMessage } from '@/lib/api/error-handler'

// Helper to get scmOrganization from either Integration or SCMConnection
function getScmOrganization(connection: Integration | SCMConnection): string {
  // SCMConnection uses camelCase
  if ('scmOrganization' in connection && connection.scmOrganization) {
    return connection.scmOrganization
  }
  // Integration uses scm_extension
  if ('scm_extension' in connection && connection.scm_extension?.scm_organization) {
    return connection.scm_extension.scm_organization
  }
  return ''
}

const editConnectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  accessToken: z.string().max(500, 'Token is too long').optional(),
  scmOrganization: z
    .string()
    .max(100, 'Organization name must be less than 100 characters')
    .optional(),
})

type EditConnectionFormData = z.infer<typeof editConnectionSchema>

interface EditConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection: Integration | SCMConnection
  onSuccess?: () => void
}

export function EditConnectionDialog({
  open,
  onOpenChange,
  connection,
  onSuccess,
}: EditConnectionDialogProps) {
  const [showToken, setShowToken] = useState(false)

  const initialScmOrganization = getScmOrganization(connection)

  const form = useForm<EditConnectionFormData>({
    resolver: zodResolver(editConnectionSchema),
    defaultValues: {
      name: connection.name,
      accessToken: '',
      scmOrganization: initialScmOrganization,
    },
  })

  const { trigger: updateConnection, isMutating: isUpdating } = useUpdateIntegrationApi(
    connection.id
  )
  const { trigger: validateConnection, isMutating: isValidating } = useTestIntegrationApi(
    connection.id
  )

  // Reset form when dialog opens or connection changes
  useEffect(() => {
    if (open) {
      form.reset({
        name: connection.name,
        accessToken: '',
        scmOrganization: getScmOrganization(connection),
      })
      setShowToken(false)
    }
  }, [open, connection, form])

  const onSubmit = async (data: EditConnectionFormData) => {
    try {
      // Only include fields that have changed
      const updateData: { name?: string; credentials?: string; scm_organization?: string } = {}
      const currentScmOrganization = getScmOrganization(connection)

      if (data.name !== connection.name) {
        updateData.name = data.name
      }
      if (data.accessToken && data.accessToken.length > 0) {
        updateData.credentials = data.accessToken
      }
      if (data.scmOrganization !== currentScmOrganization) {
        updateData.scm_organization = data.scmOrganization || undefined
      }

      // Only call API if there are changes
      if (Object.keys(updateData).length === 0) {
        toast.info('No changes to save')
        onOpenChange(false)
        return
      }

      await updateConnection(updateData)

      // If token was updated, test the connection
      if (updateData.credentials) {
        toast.info('Testing updated credentials...')
        try {
          const result = await validateConnection()
          if (result?.status === 'connected') {
            toast.success(`Connection "${data.name}" updated and verified successfully`)
          } else {
            toast.warning(
              `Connection updated but verification failed: ${result?.status_message || 'Unknown error'}`
            )
          }
        } catch {
          toast.warning('Connection updated but verification failed')
        }
      } else {
        toast.success(`Connection "${data.name}" updated successfully`)
      }

      await invalidateSCMIntegrationsCache()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update connection'))
    }
  }

  const handleClose = () => {
    form.reset()
    setShowToken(false)
    onOpenChange(false)
  }

  const isSaving = isUpdating || isValidating

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Connection
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <ProviderIcon provider={connection.provider} className="h-4 w-4" />
            {SCM_PROVIDER_LABELS[connection.provider as keyof typeof SCM_PROVIDER_LABELS] ||
              connection.provider}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Connection Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., My GitHub Enterprise" {...field} />
                  </FormControl>
                  <FormDescription>A friendly name to identify this connection</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Organization (optional) */}
            <FormField
              control={form.control}
              name="scmOrganization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization / Group (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., my-org" {...field} />
                  </FormControl>
                  <FormDescription>
                    Limit repositories to a specific organization or group
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Access Token */}
            <FormField
              control={form.control}
              name="accessToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Access Token</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showToken ? 'text' : 'password'}
                        placeholder="Leave empty to keep current token"
                        className="pr-10"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Enter a new token to update credentials, or leave empty to keep current
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
