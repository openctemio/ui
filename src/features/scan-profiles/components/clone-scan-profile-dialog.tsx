'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Copy } from 'lucide-react'
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

import {
  cloneScanProfileSchema,
  type CloneScanProfileFormData,
} from '../schemas/scan-profile-schema'
import { useCloneScanProfile, invalidateScanProfilesCache } from '@/lib/api/scan-profile-hooks'
import type { ScanProfile } from '@/lib/api/scan-profile-types'

interface CloneScanProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: ScanProfile
  onSuccess?: () => void
}

export function CloneScanProfileDialog({
  open,
  onOpenChange,
  profile,
  onSuccess,
}: CloneScanProfileDialogProps) {
  const form = useForm<CloneScanProfileFormData>({
    resolver: zodResolver(cloneScanProfileSchema),
    defaultValues: {
      new_name: `${profile.name} (Copy)`,
    },
  })

  const { trigger: cloneProfile, isMutating } = useCloneScanProfile(profile.id)

  const onSubmit = async (data: CloneScanProfileFormData) => {
    try {
      await cloneProfile(data)
      toast.success(`Profile cloned as "${data.new_name}"`)
      await invalidateScanProfilesCache()
      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to clone profile'))
    }
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset({ new_name: `${profile.name} (Copy)` })
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Clone Scan Profile
          </DialogTitle>
          <DialogDescription>
            Create a copy of &quot;{profile.name}&quot; with a new name.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="new_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Profile Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a name for the cloned profile" {...field} />
                  </FormControl>
                  <FormMessage />
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
                Clone Profile
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
