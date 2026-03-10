'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AssetGroupSelect } from '@/features/asset-groups'
import type { FormFieldConfig } from '../types/page-config.types'
import type { Asset } from '../types'

interface AssetFormDialogSharedProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  fields: FormFieldConfig[]
  asset?: Asset | null
  onSubmit: (data: Record<string, unknown>) => Promise<boolean>
  isSubmitting: boolean
  includeGroupSelect?: boolean
}

function getInitialValues(
  fields: FormFieldConfig[],
  asset?: Asset | null
): Record<string, string | boolean | number> {
  const values: Record<string, string | boolean | number> = {}
  for (const field of fields) {
    if (asset) {
      const raw = field.isMetadata
        ? (asset.metadata as Record<string, unknown>)?.[field.name]
        : (asset[field.name as keyof typeof asset] as unknown)
      if (field.type === 'boolean') {
        values[field.name] = raw === true
      } else if (field.type === 'tags' && Array.isArray(raw)) {
        values[field.name] = raw.join(', ')
      } else {
        values[field.name] = raw != null ? String(raw) : ''
      }
    } else {
      values[field.name] = field.defaultValue ?? (field.type === 'boolean' ? false : '')
    }
  }
  return values
}

export function AssetFormDialogShared({
  open,
  onOpenChange,
  title,
  description,
  fields,
  asset,
  onSubmit,
  isSubmitting,
  includeGroupSelect,
}: AssetFormDialogSharedProps) {
  const [formData, setFormData] = useState<Record<string, string | boolean | number>>(() =>
    getInitialValues(fields, asset)
  )
  const [groupId, setGroupId] = useState(asset?.groupId || '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setFormData(getInitialValues(fields, asset))
      setGroupId(asset?.groupId || '')
      setErrors({})
    }
  }, [open, asset, fields])

  const handleChange = useCallback((name: string, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }, [])

  // Validate required fields
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}
    for (const field of fields) {
      if (!field.required) continue
      const raw = formData[field.name]
      if (field.type === 'boolean') continue // booleans always have a value
      if (raw === undefined || raw === '' || raw === null) {
        newErrors[field.name] = `${field.label} is required`
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [fields, formData])

  // Tags dedup and length validation
  const sanitizeTags = useCallback((raw: string): string[] => {
    return [
      ...new Set(
        raw
          .split(',')
          .map((s) => s.trim().slice(0, 100))
          .filter(Boolean)
      ),
    ]
  }, [])

  const handleSubmit = async () => {
    if (!validate()) return

    const data: Record<string, unknown> = {}

    for (const field of fields) {
      const raw = formData[field.name]
      if (field.type === 'tags' && typeof raw === 'string') {
        data[field.name] = sanitizeTags(raw)
      } else if (field.type === 'number' && typeof raw === 'string') {
        data[field.name] = raw ? Number(raw) : undefined
      } else {
        data[field.name] = raw
      }
    }

    if (includeGroupSelect) {
      data.groupId = groupId
    }

    const success = await onSubmit(data)
    if (success) {
      onOpenChange(false)
    }
  }

  // Check if form is valid (for disabling submit button)
  const hasRequiredEmpty = useMemo(() => {
    return fields.some((f) => {
      if (!f.required || f.type === 'boolean') return false
      const raw = formData[f.name]
      return raw === undefined || raw === '' || raw === null
    })
  }, [fields, formData])

  const renderField = (field: FormFieldConfig) => {
    const value = formData[field.name]

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={field.name}
            value={String(value ?? '')}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
          />
        )

      case 'select':
        return (
          <Select value={String(value ?? '')} onValueChange={(v) => handleChange(field.name, v)}>
            <SelectTrigger>
              <SelectValue
                placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
              />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'boolean':
        return (
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id={field.name}
              checked={value === true}
              onCheckedChange={(checked) => handleChange(field.name, checked === true)}
            />
            <Label htmlFor={field.name} className="text-sm font-normal cursor-pointer">
              {field.placeholder || field.label}
            </Label>
          </div>
        )

      case 'number':
        return (
          <Input
            id={field.name}
            type="number"
            value={String(value ?? '')}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
          />
        )

      case 'tags':
        return (
          <Input
            id={field.name}
            value={String(value ?? '')}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder || 'Comma-separated values'}
            maxLength={500}
          />
        )

      default:
        return (
          <Input
            id={field.name}
            value={String(value ?? '')}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            maxLength={255}
          />
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {fields.map((field) => (
            <div key={field.name} className={field.fullWidth ? '' : ''}>
              {field.type !== 'boolean' && (
                <Label htmlFor={field.name} className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
              )}
              <div className="mt-1.5">{renderField(field)}</div>
              {errors[field.name] && (
                <p className="text-xs text-red-500 mt-1">{errors[field.name]}</p>
              )}
            </div>
          ))}

          {includeGroupSelect && (
            <div>
              <Label className="text-sm font-medium">Group</Label>
              <div className="mt-1.5">
                <AssetGroupSelect value={groupId} onValueChange={setGroupId} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || hasRequiredEmpty}>
            {isSubmitting ? 'Saving...' : asset ? 'Save Changes' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
