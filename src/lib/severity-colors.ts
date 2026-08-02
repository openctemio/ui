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

/** Badge Tailwind classes — soft-tint variant (translucent fill, hued text; used
 *  for count badges and dark-friendly list pills). */
export const SEVERITY_BADGE_SOFT: Record<SeverityLevel, string> = {
  critical: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  info: 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30',
}

/** Text colors for inline severity text */
export const SEVERITY_TEXT_COLORS: Record<SeverityLevel, string> = {
  critical: 'text-red-600 dark:text-red-400',
  high: 'text-orange-600 dark:text-orange-400',
  medium: 'text-yellow-700 dark:text-yellow-400',
  low: 'text-blue-600 dark:text-blue-400',
  info: 'text-gray-600 dark:text-gray-400',
}

/** Dot/indicator colors (pure background token) */
export const SEVERITY_DOT_COLORS: Record<SeverityLevel, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  info: 'bg-gray-500',
}

/** Foreground color that reads on the solid background above. */
export const SEVERITY_SOLID_TEXT: Record<SeverityLevel, string> = {
  critical: 'text-white',
  high: 'text-white',
  medium: 'text-black',
  low: 'text-white',
  info: 'text-white',
}

/** Border token matching the severity hue. */
export const SEVERITY_BORDER_COLORS: Record<SeverityLevel, string> = {
  critical: 'border-red-500',
  high: 'border-orange-500',
  medium: 'border-yellow-500',
  low: 'border-blue-500',
  info: 'border-gray-500',
}

/** Gradient stops (`from-*`/`to-*`) for hero/header surfaces tinted by severity. */
export const SEVERITY_GRADIENT_COLORS: Record<SeverityLevel, string> = {
  critical: 'from-red-500 to-red-600',
  high: 'from-orange-500 to-orange-600',
  medium: 'from-yellow-500 to-yellow-600',
  low: 'from-blue-500 to-blue-600',
  info: 'from-gray-500 to-gray-600',
}
