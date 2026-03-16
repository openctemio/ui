/**
 * Dev-only logger utility.
 *
 * All log/warn/error calls are silenced in production builds.
 * Usage:
 *   import { devLog } from '@/lib/logger'
 *   devLog.log('[MyModule] Something happened', data)
 *   devLog.warn('[MyModule] Warning', data)
 *   devLog.error('[MyModule] Error', error)
 */

const isDev = process.env.NODE_ENV !== 'production'

export const devLog = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args)
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args)
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args)
  },
}
