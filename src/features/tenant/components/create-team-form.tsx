/**
 * Create Team Form Component
 *
 * Form for creating a new team/tenant
 * - For new users (no tenants): Uses createFirstTeamAction with refresh token
 * - For existing users (has tenants): Uses useCreateTenant with access token
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { devLog } from '@/lib/logger'
import { useRouter } from 'next/navigation'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useCreateTenant } from '../api'
import { createTenantSchema, generateSlug, type CreateTenantInput } from '../schemas'
import { createFirstTeamAction } from '@/features/auth/actions/local-auth-actions'

interface CreateTeamFormProps {
  /** Whether to show cancel button (hide when shown in TenantGate) */
  showCancel?: boolean
  /** Whether this is for a new user creating their first team */
  isFirstTeam?: boolean
  /** Suggested team name (from user's name) */
  suggestedName?: string
}

// Wrapper component that handles both first team and additional team flows
export function CreateTeamForm({
  showCancel = true,
  isFirstTeam = false,
  suggestedName = '',
}: CreateTeamFormProps) {
  // For first team creation, we don't need TenantProvider context
  // Use the simpler form that only uses server action
  if (isFirstTeam) {
    return <CreateFirstTeamFormInner showCancel={showCancel} suggestedName={suggestedName} />
  }

  // For additional teams, we need TenantProvider context
  return <CreateAdditionalTeamFormInner showCancel={showCancel} suggestedName={suggestedName} />
}

// ============================================
// FIRST TEAM FORM (no TenantProvider needed)
// ============================================

function CreateFirstTeamFormInner({
  showCancel,
  suggestedName,
}: {
  showCancel: boolean
  suggestedName: string
}) {
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateTenantInput>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: suggestedName ? `${suggestedName}'s Team` : '',
      slug: suggestedName ? generateSlug(suggestedName) : '',
      description: '',
    },
    mode: 'onChange',
  })

  const watchName = form.watch('name')

  // Auto-generate slug from name if not manually edited
  useEffect(() => {
    if (!isSlugManuallyEdited && watchName) {
      const generatedSlug = generateSlug(watchName)
      form.setValue('slug', generatedSlug, { shouldValidate: true })
    }
  }, [watchName, isSlugManuallyEdited, form])

  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsSlugManuallyEdited(true)
      const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
      form.setValue('slug', value, { shouldValidate: true })
    },
    [form]
  )

  const onSubmit = async (data: CreateTenantInput) => {
    setIsSubmitting(true)

    try {
      devLog.log('[CreateTeamForm] Creating first team via server action')
      const result = await createFirstTeamAction({
        teamName: data.name,
        teamSlug: data.slug,
      })

      if (result.success && result.tenant) {
        toast.success('Team created successfully', {
          description: `Welcome to ${result.tenant.name}!`,
        })

        // Force full page reload to pick up new cookies
        window.location.href = '/'
      } else {
        throw new Error(result.error || 'Failed to create team')
      }
    } catch (error) {
      console.error('Failed to create team:', error)
      handleFormError(error, form)
    } finally {
      setIsSubmitting(false)
    }
  }

  const slugValue = form.watch('slug')
  const isFormValid = form.formState.isValid

  return (
    <CreateTeamFormUI
      form={form}
      onSubmit={onSubmit}
      handleSlugChange={handleSlugChange}
      slugValue={slugValue}
      isFormValid={isFormValid}
      isSubmitting={isSubmitting}
      isMutating={false}
      showCancel={showCancel}
    />
  )
}

// ============================================
// ADDITIONAL TEAM FORM (requires TenantProvider)
// ============================================

function CreateAdditionalTeamFormInner({
  showCancel,
  suggestedName,
}: {
  showCancel: boolean
  suggestedName: string
}) {
  const router = useRouter()
  const { trigger, isMutating } = useCreateTenant()
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateTenantInput>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: suggestedName ? `${suggestedName}'s Team` : '',
      slug: suggestedName ? generateSlug(suggestedName) : '',
      description: '',
    },
    mode: 'onChange',
  })

  const watchName = form.watch('name')

  // Auto-generate slug from name if not manually edited
  useEffect(() => {
    if (!isSlugManuallyEdited && watchName) {
      const generatedSlug = generateSlug(watchName)
      form.setValue('slug', generatedSlug, { shouldValidate: true })
    }
  }, [watchName, isSlugManuallyEdited, form])

  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsSlugManuallyEdited(true)
      const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
      form.setValue('slug', value, { shouldValidate: true })
    },
    [form]
  )

  const onSubmit = async (data: CreateTenantInput) => {
    setIsSubmitting(true)

    try {
      devLog.log('[CreateTeamForm] Creating additional team via API')
      const result = await trigger({
        name: data.name,
        slug: data.slug,
        description: data.description || undefined,
      })

      if (result) {
        toast.success('Team created successfully', {
          description: `Welcome to ${result.name}!`,
        })

        // Call switch-team API directly to set cookies, then reload
        // This avoids race condition with refreshTenants/switchTeam
        try {
          const switchResponse = await fetch('/api/auth/switch-team', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              tenant_id: result.id,
              tenant_name: result.name,
            }),
          })

          if (!switchResponse.ok) {
            devLog.error('[CreateTeamForm] Failed to switch to new team')
          }
        } catch (switchError) {
          devLog.error('[CreateTeamForm] Switch team error:', switchError)
        }

        // Force full page reload to pick up new cookies and refresh all state
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Failed to create team:', error)
      handleFormError(error, form)
    } finally {
      setIsSubmitting(false)
    }
  }

  const slugValue = form.watch('slug')
  const isFormValid = form.formState.isValid

  return (
    <CreateTeamFormUI
      form={form}
      onSubmit={onSubmit}
      handleSlugChange={handleSlugChange}
      slugValue={slugValue}
      isFormValid={isFormValid}
      isSubmitting={isSubmitting}
      isMutating={isMutating}
      showCancel={showCancel}
      onCancel={() => router.back()}
    />
  )
}

// ============================================
// SHARED UI COMPONENT
// ============================================

interface CreateTeamFormUIProps {
  form: UseFormReturn<CreateTenantInput>
  onSubmit: (data: CreateTenantInput) => Promise<void>
  handleSlugChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  slugValue: string
  isFormValid: boolean
  isSubmitting: boolean
  isMutating: boolean
  showCancel: boolean
  onCancel?: () => void
}

function CreateTeamFormUI({
  form,
  onSubmit,
  handleSlugChange,
  slugValue: _slugValue,
  isFormValid,
  isSubmitting,
  isMutating,
  showCancel,
  onCancel,
}: CreateTeamFormUIProps) {
  // No Card wrapper, no duplicate title, no icon clutter on labels.
  // The page-level <h1> already says "Set up your first team" — the form
  // just needs to be the form, not re-introduce a card title.
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Team Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Acme Corporation"
                  autoFocus
                  disabled={isMutating || isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* URL Slug — single composite input. The "app.openctem.io/" prefix
            sits inline at the start of the box; the input shares the same
            border so the whole thing reads as one field, not two glued
            rectangles. */}
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team URL</FormLabel>
              <FormControl>
                <div className="border-input bg-background focus-within:border-ring focus-within:ring-ring/50 flex h-9 items-center rounded-md border shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]">
                  <span className="text-muted-foreground select-none ps-3 text-sm">
                    app.openctem.io/
                  </span>
                  <Input
                    placeholder="acme-corp"
                    className="border-0 shadow-none focus-visible:ring-0 ps-1"
                    disabled={isMutating || isSubmitting}
                    {...field}
                    onChange={handleSlugChange}
                  />
                </div>
              </FormControl>
              <FormDescription className="text-xs">
                Lowercase letters, numbers, and hyphens only.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description — optional, no resize handle, no double-description text */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-baseline gap-2">
                Description
                <span className="text-muted-foreground text-xs font-normal">Optional</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What does this team work on?"
                  rows={3}
                  disabled={isMutating || isSubmitting}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action row — primary button is full-width when there's no Cancel
            (onboarding case) so the next step is unmistakable. With Cancel,
            buttons share the row. No icon on the Create button — the text
            "Create team" is enough. */}
        <div className="flex gap-3 pt-2">
          {showCancel && onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isMutating || isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="lg"
            disabled={isMutating || isSubmitting || !isFormValid}
            className="flex-1"
          >
            {isMutating || isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating team…
              </>
            ) : (
              'Create team'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

// ============================================
// HELPERS
// ============================================

function handleFormError(error: unknown, form: UseFormReturn<CreateTenantInput>) {
  const errorMessage = getErrorMessage(error, 'An unexpected error occurred. Please try again.')

  if (
    errorMessage.includes('slug') ||
    errorMessage.includes('already exists') ||
    errorMessage.includes('already taken')
  ) {
    form.setError('slug', {
      type: 'manual',
      message: 'This URL is already taken. Please choose another one.',
    })
  } else {
    toast.error(getErrorMessage(error, 'Failed to create team'))
  }
}
