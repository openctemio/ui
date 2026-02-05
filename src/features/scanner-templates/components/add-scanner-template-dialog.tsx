'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Upload, FileCode2, AlertTriangle, CheckCircle } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import {
  useCreateScannerTemplate,
  useValidateScannerTemplate,
  invalidateScannerTemplatesCache,
} from '@/lib/api/scanner-template-hooks'
import type { TemplateType, TemplateValidationResult } from '@/lib/api/scanner-template-types'
import {
  TEMPLATE_TYPES,
  TEMPLATE_TYPE_DISPLAY_NAMES,
  TEMPLATE_TYPE_DESCRIPTIONS,
  TEMPLATE_TYPE_EXTENSIONS,
  TEMPLATE_TYPE_MAX_SIZES,
  encodeTemplateContent,
  formatTemplateSize,
} from '@/lib/api/scanner-template-types'
import { getErrorMessage } from '@/lib/api/error-handler'

// Form schema
const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  template_type: z.enum(TEMPLATE_TYPES, { message: 'Template type is required' }),
  description: z.string().max(1000, 'Description is too long').optional(),
  content: z.string().min(1, 'Template content is required'),
  tags: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface AddScannerTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddScannerTemplateDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddScannerTemplateDialogProps) {
  const [validationResult, setValidationResult] = useState<TemplateValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const { trigger: createTemplate, isMutating: isCreating } = useCreateScannerTemplate()
  const { trigger: validateTemplate } = useValidateScannerTemplate()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      template_type: undefined,
      description: '',
      content: '',
      tags: '',
    },
  })

  const selectedType = form.watch('template_type')
  const content = form.watch('content')

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      form.reset()
      setValidationResult(null)
      setFileName(null)
    }
  }, [open, form])

  // Validate content
  const validateContent = useCallback(
    async (content: string, type: TemplateType) => {
      if (!content || !type) return

      setIsValidating(true)
      try {
        const result = await validateTemplate({
          template_type: type,
          content: encodeTemplateContent(content),
        })
        setValidationResult(result ?? null)
      } catch (_err) {
        setValidationResult({
          valid: false,
          errors: [
            { field: 'content', message: 'Failed to validate template', code: 'VALIDATION_ERROR' },
          ],
          rule_count: 0,
        })
      } finally {
        setIsValidating(false)
      }
    },
    [validateTemplate]
  )

  // Handle file upload
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Check file size
      const type = selectedType as TemplateType
      if (type && file.size > TEMPLATE_TYPE_MAX_SIZES[type]) {
        toast.error(
          `File too large. Maximum size for ${TEMPLATE_TYPE_DISPLAY_NAMES[type]} is ${formatTemplateSize(TEMPLATE_TYPE_MAX_SIZES[type])}`
        )
        return
      }

      // Read file content
      const reader = new FileReader()
      reader.onload = async (event) => {
        const text = event.target?.result as string
        form.setValue('content', text)
        setFileName(file.name)

        // Auto-fill name if empty
        if (!form.getValues('name')) {
          const baseName = file.name.replace(/\.(yaml|yml|toml)$/i, '')
          form.setValue('name', baseName)
        }

        // Auto-validate
        if (selectedType) {
          await validateContent(text, selectedType)
        }
      }
      reader.readAsText(file)
    },
    [form, selectedType, validateContent]
  )

  // Handle type change
  const handleTypeChange = useCallback(
    async (type: TemplateType) => {
      form.setValue('template_type', type)
      if (content) {
        await validateContent(content, type)
      }
    },
    [form, content, validateContent]
  )

  // Submit form
  const onSubmit = useCallback(
    async (values: FormValues) => {
      // Require validation before submit
      if (!validationResult?.valid) {
        toast.error('Please fix validation errors before uploading')
        return
      }

      try {
        await createTemplate({
          name: values.name,
          template_type: values.template_type,
          description: values.description || undefined,
          content: encodeTemplateContent(values.content),
          tags: values.tags
            ? values.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : undefined,
        })

        toast.success(`Template "${values.name}" created successfully`)
        await invalidateScannerTemplatesCache()
        onOpenChange(false)
        onSuccess?.()
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to create template'))
      }
    },
    [createTemplate, validationResult, onOpenChange, onSuccess]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5" />
            Upload Scanner Template
          </DialogTitle>
          <DialogDescription>
            Upload a custom template for Nuclei, Semgrep, or Gitleaks scanners.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Template Type */}
            <FormField
              control={form.control}
              name="template_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Type</FormLabel>
                  <Select
                    onValueChange={(v) => handleTypeChange(v as TemplateType)}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a scanner type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TEMPLATE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex flex-col">
                            <span>{TEMPLATE_TYPE_DISPLAY_NAMES[type]}</span>
                            <span className="text-xs text-muted-foreground">
                              {TEMPLATE_TYPE_DESCRIPTIONS[type]}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="my-custom-template" {...field} />
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
                      placeholder="A brief description of what this template detects..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template File</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept={
                            selectedType
                              ? TEMPLATE_TYPE_EXTENSIONS[selectedType]
                              : '.yaml,.yml,.toml'
                          }
                          onChange={handleFileUpload}
                          className="hidden"
                          id="template-file"
                          disabled={!selectedType}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!selectedType}
                          onClick={() => document.getElementById('template-file')?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Choose File
                        </Button>
                        {fileName && (
                          <span className="text-sm text-muted-foreground">{fileName}</span>
                        )}
                      </div>
                      {selectedType && (
                        <FormDescription>
                          Accepted: {TEMPLATE_TYPE_EXTENSIONS[selectedType]} (max{' '}
                          {formatTemplateSize(TEMPLATE_TYPE_MAX_SIZES[selectedType])})
                        </FormDescription>
                      )}
                      {field.value && (
                        <Textarea
                          placeholder="Or paste template content here..."
                          className="font-mono text-sm"
                          rows={6}
                          value={field.value}
                          onChange={(e) => {
                            field.onChange(e.target.value)
                            setFileName(null)
                            setValidationResult(null)
                          }}
                        />
                      )}
                    </div>
                  </FormControl>
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
                  <FormLabel>Tags (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="sqli, owasp, web" {...field} />
                  </FormControl>
                  <FormDescription>Comma-separated tags for filtering</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Validation Result */}
            {isValidating && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>Validating...</AlertTitle>
                <AlertDescription>Checking template syntax and structure</AlertDescription>
              </Alert>
            )}

            {validationResult &&
              !isValidating &&
              (validationResult.valid ? (
                <Alert className="border-green-500/30 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-500">Valid Template</AlertTitle>
                  <AlertDescription>
                    Found {validationResult.rule_count}{' '}
                    {validationResult.rule_count === 1 ? 'rule' : 'rules'}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Validation Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 list-inside list-disc">
                      {validationResult.errors?.map((error, i) => (
                        <li key={i}>
                          {error.field}: {error.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ))}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || !validationResult?.valid}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload Template
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
