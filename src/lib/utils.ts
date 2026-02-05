import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { nanoid } from 'nanoid'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// =============================================================================
// IDENTIFIER GENERATION
// =============================================================================

/**
 * Slugify a string into a valid ASCII identifier
 * - Lowercase
 * - Replace spaces/underscores with hyphens
 * - Remove ALL non-ASCII and special characters (security: explicit ASCII only)
 * - Trim leading/trailing hyphens
 *
 * @security Uses explicit ASCII range [a-z0-9] to prevent Unicode bypass attacks
 */
export function slugify(text: string, maxLength: number = 40): string {
  if (!text || typeof text !== 'string') {
    return ''
  }
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // SECURITY: Explicit ASCII only (no \w which includes Unicode)
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .slice(0, maxLength)
}

/**
 * Generate a unique step key for pipeline steps
 * Format: {slug}-{nanoid(8)} e.g., "semgrep-V1StGXnO", "nuclei-scan-x9K2mNpQ"
 *
 * nanoid(8) provides:
 * - 64^8 = ~281 trillion combinations
 * - URL-safe characters (A-Za-z0-9_-)
 * - Cryptographically secure randomness
 * - Lower collision probability than nanoid(6)
 *
 * @security This generates a CLIENT-SIDE key for UI purposes only.
 * Backend MUST validate and may regenerate if collision detected.
 *
 * @param name - Tool name or step label to slugify
 * @returns Unique step key like "semgrep-V1StGXnO"
 */
export function generateStepKey(name: string): string {
  const slug = slugify(name, 40)
  const suffix = nanoid(8) // Increased from 6 to 8 for better collision resistance
  return slug ? `${slug}-${suffix}` : `step-${suffix}`
}

/**
 * Generate a temporary client-side ID for pipeline steps
 * Format: temp-{nanoid(12)} e.g., "temp-V1StGXnO9_cK"
 *
 * @security This is a TEMPORARY ID for UI state management only.
 * Backend MUST replace this with a server-generated UUID on save.
 * The "temp-" prefix makes it clear this should not be persisted.
 *
 * @returns Temporary step ID (will be replaced by backend)
 */
export function generateTempStepId(): string {
  return `temp-${nanoid(12)}`
}

export function sleep(ms: number = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generates page numbers for pagination with ellipsis
 * @param currentPage - Current page number (1-based)
 * @param totalPages - Total number of pages
 * @returns Array of page numbers and ellipsis strings
 *
 * Examples:
 * - Small dataset (≤5 pages): [1, 2, 3, 4, 5]
 * - Near beginning: [1, 2, 3, 4, '...', 10]
 * - In middle: [1, '...', 4, 5, 6, '...', 10]
 * - Near end: [1, '...', 7, 8, 9, 10]
 */
export function getPageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5 // Maximum number of page buttons to show
  const rangeWithDots = []

  if (totalPages <= maxVisiblePages) {
    // If total pages is 5 or less, show all pages
    for (let i = 1; i <= totalPages; i++) {
      rangeWithDots.push(i)
    }
  } else {
    // Always show first page
    rangeWithDots.push(1)

    if (currentPage <= 3) {
      // Near the beginning: [1] [2] [3] [4] ... [10]
      for (let i = 2; i <= 4; i++) {
        rangeWithDots.push(i)
      }
      rangeWithDots.push('...', totalPages)
    } else if (currentPage >= totalPages - 2) {
      // Near the end: [1] ... [7] [8] [9] [10]
      rangeWithDots.push('...')
      for (let i = totalPages - 3; i <= totalPages; i++) {
        rangeWithDots.push(i)
      }
    } else {
      // In the middle: [1] ... [4] [5] [6] ... [10]
      rangeWithDots.push('...')
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        rangeWithDots.push(i)
      }
      rangeWithDots.push('...', totalPages)
    }
  }

  return rangeWithDots
}

// =============================================================================
// DATA EXPORT UTILITIES
// =============================================================================

/**
 * Export data to CSV format and trigger download
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 * @param columns - Optional custom column mapping { key: label }
 */
export function exportToCSV<T extends object>(
  data: T[],
  filename: string,
  columns?: Record<string, string>
): void {
  if (data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Get headers from columns mapping or first data item
  const headers = columns ? Object.keys(columns) : Object.keys(data[0] as object)
  const headerLabels = columns ? Object.values(columns) : headers

  // Build CSV content
  const csvRows: string[] = []

  // Header row
  csvRows.push(headerLabels.map(escapeCSVField).join(','))

  // Data rows
  for (const item of data) {
    const values = headers.map((key) => {
      const value = (item as Record<string, unknown>)[key]
      if (value === null || value === undefined) return ''
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    })
    csvRows.push(values.map(escapeCSVField).join(','))
  }

  const csvContent = csvRows.join('\n')
  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;')
}

/**
 * Export data to JSON format and trigger download
 * @param data - Data to export (array or object)
 * @param filename - Name of the file (without extension)
 */
export function exportToJSON<T>(data: T, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2)
  downloadFile(jsonContent, `${filename}.json`, 'application/json')
}

/**
 * Escape a CSV field value (handle commas, quotes, newlines)
 */
function escapeCSVField(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Trigger file download in browser
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up the URL object
  URL.revokeObjectURL(url)
}
