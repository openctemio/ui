'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
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
import { ScrollArea } from '@/components/ui/scroll-area'
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

import { useCreateCapability } from '@/lib/api/capability-hooks'

const createCapabilitySchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters')
    .regex(
      /^[a-z][a-z0-9_]*$/,
      'Name must start with lowercase letter and contain only lowercase letters, numbers, and underscores'
    ),
  display_name: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  icon: z.string(),
  color: z.string(),
  category: z.string().optional(),
})

type CreateCapabilityFormData = z.infer<typeof createCapabilitySchema>

const ICON_OPTIONS = [
  { value: 'zap', label: 'Zap' },
  { value: 'code', label: 'Code' },
  { value: 'package', label: 'Package' },
  { value: 'globe', label: 'Globe' },
  { value: 'key', label: 'Key' },
  { value: 'server', label: 'Server' },
  { value: 'box', label: 'Box' },
  { value: 'search', label: 'Search' },
  { value: 'layers', label: 'Layers' },
  { value: 'shield', label: 'Shield' },
  { value: 'lock', label: 'Lock' },
  { value: 'eye', label: 'Eye' },
  { value: 'file-text', label: 'File Text' },
  { value: 'terminal', label: 'Terminal' },
  { value: 'cpu', label: 'CPU' },
]

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'green', label: 'Green' },
  { value: 'red', label: 'Red' },
  { value: 'orange', label: 'Orange' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'teal', label: 'Teal' },
  { value: 'amber', label: 'Amber' },
]

const CATEGORY_OPTIONS = [
  { value: 'security', label: 'Security' },
  { value: 'recon', label: 'Reconnaissance' },
  { value: 'analysis', label: 'Analysis' },
]

interface CreateCapabilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateCapabilityDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCapabilityDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { trigger: createCapability } = useCreateCapability()

  const form = useForm<CreateCapabilityFormData>({
    resolver: zodResolver(createCapabilitySchema),
    defaultValues: {
      name: '',
      display_name: '',
      description: '',
      icon: 'zap',
      color: 'blue',
      category: undefined,
    },
  })

  const handleSubmit = async (data: CreateCapabilityFormData) => {
    setIsSubmitting(true)
    try {
      await createCapability(data)
      toast.success(`Capability "${data.display_name}" created`)
      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create capability'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Auto-generate name from display_name
  const handleDisplayNameChange = (value: string) => {
    form.setValue('display_name', value)
    // Only auto-generate name if name field is empty or was auto-generated
    const currentName = form.getValues('name')
    const autoName = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/^([0-9])/, 'cap_$1') // Ensure starts with letter

    if (
      !currentName ||
      currentName ===
        form
          .getValues('display_name')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .replace(/^([0-9])/, 'cap_$1')
    ) {
      form.setValue('name', autoName)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Custom Capability</DialogTitle>
          <DialogDescription>
            Add a new capability to categorize what your tools can do.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Web Application Security"
                        {...field}
                        onChange={(e) => handleDisplayNameChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., web_security" {...field} />
                    </FormControl>
                    <FormDescription>
                      Unique identifier (lowercase, underscores allowed)
                    </FormDescription>
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
                        placeholder="Describe what this capability represents..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Responsive: stack on mobile, 3 cols on sm+ */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
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
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ICON_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
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
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COLOR_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </ScrollArea>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={form.handleSubmit(handleSubmit)}
            className="w-full sm:w-auto"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Capability
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
