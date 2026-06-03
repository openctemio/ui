'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'

export interface ExportFieldConfig<T> {
  /** Column header in the CSV */
  header: string
  /** Function to extract value from item */
  accessor: (item: T) => unknown
  /** Optional transform for display */
  transform?: (value: unknown) => string
}

/**
 * Sanitize a CSV cell to prevent formula injection.
 * Prefixes cells starting with =, +, -, @, \t, \r with a single quote.
 * Wraps cells containing commas, quotes, or newlines in double quotes.
 */
export function sanitizeCsvCell(value: unknown): string {
  const str = String(value ?? '')
  // Prevent formula injection (OWASP CSV injection)
  // Check for dangerous chars including after leading whitespace
  if (/^\s*[=+\-@\t\r]/.test(str)) return `'${str}`
  // Escape quotes and wrap if contains delimiters
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Generic, reusable CSV export hook.
 *
 * Generates a sanitized CSV (formula-injection safe) with a UTF-8 BOM for
 * Excel compatibility, triggers a download, and revokes the blob URL to avoid
 * a memory leak. Used by asset pages (via the `useAssetExport` alias) and the
 * exposures page; reach for this whenever a list view needs "Export to CSV".
 */
export function useCsvExport<T>(data: T[], fields: ExportFieldConfig<T>[], filename: string) {
  const handleExport = useCallback(() => {
    if (!data?.length) {
      toast.error('No data to export')
      return
    }

    const headers = fields.map((f) => f.header).join(',')
    const rows = data.map((item) =>
      fields
        .map((f) => {
          const raw = f.accessor(item)
          const value = f.transform ? f.transform(raw) : raw
          return sanitizeCsvCell(value)
        })
        .join(',')
    )
    const csv = [headers, ...rows].join('\n')

    // BOM prefix for Excel to correctly detect UTF-8
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url) // Prevent memory leak
    toast.success('Exported successfully')
  }, [data, fields, filename])

  return { handleExport }
}
