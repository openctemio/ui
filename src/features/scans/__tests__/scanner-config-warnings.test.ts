import { describe, expect, it, vi } from 'vitest'

const warning = vi.fn()
vi.mock('sonner', () => ({ toast: { warning: (...args: unknown[]) => warning(...args) } }))

import {
  describeScannerConfigWarnings,
  notifyScannerConfigWarnings,
} from '../lib/scanner-config-warnings'

describe('scanner config secret warnings (api RFC-032 Phase 0)', () => {
  it('describes each flagged path with a readable reason', () => {
    expect(
      describeScannerConfigWarnings([
        { path: 'headers.Authorization', reason: 'known_format' },
        { path: 'password', reason: 'key_name' },
        { path: 'blob', reason: 'high_entropy' },
        { path: 'x', reason: 'something_new' },
      ])
    ).toEqual([
      'headers.Authorization: looks like a token or key',
      'password: named like a credential',
      'blob: looks like a random secret',
      'x: something_new',
    ])
    expect(describeScannerConfigWarnings(undefined)).toEqual([])
  })

  it('warns once after a save that returned warnings, and stays quiet otherwise', () => {
    warning.mockClear()
    notifyScannerConfigWarnings({ name: 'nightly', scanner_config_warnings: [] })
    notifyScannerConfigWarnings(undefined)
    expect(warning).not.toHaveBeenCalled()

    notifyScannerConfigWarnings({
      name: 'nightly',
      scanner_config_warnings: [{ path: 'token', reason: 'key_name' }],
    })
    expect(warning).toHaveBeenCalledTimes(1)
    const [title, opts] = warning.mock.calls[0] as [string, { description: string }]
    expect(title).toContain('nightly')
    expect(opts.description).toContain('token: named like a credential')
  })
})
