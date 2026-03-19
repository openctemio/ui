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

// Sanitize string arguments to prevent log injection (e.g., newline-based spoofing)
const sanitizeLogArg = (arg: unknown): unknown => {
  if (typeof arg === 'string') {
    // Remove CR and LF characters
    return arg.replace(/[\r\n]/g, '')
  }
  return arg
}

const sanitizeLogArgs = (args: unknown[]): unknown[] => args.map(sanitizeLogArg)

export const devLog = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...sanitizeLogArgs(args))
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...sanitizeLogArgs(args))
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...sanitizeLogArgs(args))
  },
}
