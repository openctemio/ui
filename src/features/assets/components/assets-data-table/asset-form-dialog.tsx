'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, type LucideIcon, Package } from 'lucide-react'
import type { Asset, AssetType, Criticality, AssetScope, ExposureLevel, CreateAssetInput, UpdateAssetInput } from '../../types'

// Form schema with required fields
const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  criticality: z.enum(['critical', 'high', 'medium', 'low']),
  scope: z.enum(['internal', 'external', 'cloud', 'partner', 'vendor', 'shadow']),
  exposure: z.enum(['public', 'restricted', 'private', 'isolated', 'unknown']),
  tags: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export interface AssetFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  asset?: Asset | null
  assetType: AssetType
  assetTypeName: string
  assetTypeIcon?: LucideIcon
  onSubmit: (data: CreateAssetInput | UpdateAssetInput) => Promise<void>
  isSubmitting?: boolean
}

const CRITICALITY_OPTIONS: { value: Criticality; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const SCOPE_OPTIONS: { value: AssetScope; label: string }[] = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'partner', label: 'Partner' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'shadow', label: 'Shadow IT' },
]

const EXPOSURE_OPTIONS: { value: ExposureLevel; label: string }[] = [
  { value: 'public', label: 'Public' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'private', label: 'Private' },
  { value: 'isolated', label: 'Isolated' },
  { value: 'unknown', label: 'Unknown' },
]

const DEFAULT_VALUES: FormValues = {
  name: '',
  description: '',
  criticality: 'medium',
  scope: 'internal',
  exposure: 'unknown',
  tags: '',
}

export function AssetFormDialog({
  open,
  onOpenChange,
  mode,
  asset,
  assetType,
  assetTypeName,
  assetTypeIcon: Icon = Package,
  onSubmit,
  isSubmitting = false,
}: AssetFormDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES,
  })

  // Reset form when dialog opens/closes or asset changes
  useEffect(() => {
    if (open && mode === 'edit' && asset) {
      form.reset({
        name: asset.name,
        description: asset.description || '',
        criticality: asset.criticality,
        scope: asset.scope,
        exposure: asset.exposure,
        tags: asset.tags?.join(', ') || '',
      })
    } else if (open && mode === 'create') {
      form.reset(DEFAULT_VALUES)
    }
  }, [open, mode, asset, form])

  const handleFormSubmit = async (values: FormValues) => {
    const tags = values.tags
      ?.split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    if (mode === 'create') {
      await onSubmit({
        type: assetType,
        name: values.name,
        description: values.description,
        criticality: values.criticality,
        scope: values.scope,
        exposure: values.exposure,
        tags,
      } as CreateAssetInput)
    } else {
      await onSubmit({
        name: values.name,
        description: values.description,
        criticality: values.criticality,
        scope: values.scope,
        exposure: values.exposure,
        tags,
      } as UpdateAssetInput)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {mode === 'create' ? `Add ${assetTypeName}` : `Edit ${assetTypeName}`}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? `Add a new ${assetTypeName.toLowerCase()} to your asset inventory.`
              : `Update the ${assetTypeName.toLowerCase()} details.`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder={`Enter ${assetTypeName.toLowerCase()} name`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter a description (optional)"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Criticality and Scope row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="criticality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Criticality</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select criticality" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CRITICALITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select scope" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SCOPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Exposure */}
            <FormField
              control={form.control}
              name="exposure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exposure Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select exposure level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXPOSURE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter tags separated by commas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === 'create' ? 'Adding...' : 'Saving...'}
                  </>
                ) : mode === 'create' ? (
                  `Add ${assetTypeName}`
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
