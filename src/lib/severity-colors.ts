/**
 * Centralized severity color system for OpenCTEM.
 *
 * ALL components must import colors from here instead of defining their own.
 * This ensures consistency across findings, exposures, assets, and charts.
 */

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'

export const SEVERITY_ORDER: SeverityLevel[] = ['critical', 'high', 'medium', 'low', 'info']

/** Chart hex colors (for recharts, inline styles) */
export const SEVERITY_CHART_COLORS: Record<SeverityLevel, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

/** Badge Tailwind classes — light variant (for cards, lists) */
export const SEVERITY_BADGE_LIGHT: Record<SeverityLevel, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400',
  medium:
    'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  info: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400',
}

/** Badge Tailwind classes — solid variant (for prominent display) */
export const SEVERITY_BADGE_SOLID: Record<SeverityLevel, string> = {
  critical: 'bg-red-500 text-white hover:bg-red-600',
  high: 'bg-orange-500 text-white hover:bg-orange-600',
  medium: 'bg-yellow-500 text-black hover:bg-yellow-600',
  low: 'bg-blue-500 text-white hover:bg-blue-600',
  info: 'bg-gray-500 text-white hover:bg-gray-600',
}

/** Text colors for inline severity text */
export const SEVERITY_TEXT_COLORS: Record<SeverityLevel, string> = {
  critical: 'text-red-600 dark:text-red-400',
  high: 'text-orange-600 dark:text-orange-400',
  medium: 'text-yellow-700 dark:text-yellow-400',
  low: 'text-blue-600 dark:text-blue-400',
  info: 'text-gray-600 dark:text-gray-400',
}

/** Dot/indicator colors */
export const SEVERITY_DOT_COLORS: Record<SeverityLevel, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  info: 'bg-gray-500',
}
