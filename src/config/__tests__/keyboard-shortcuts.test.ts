/**
 * Help > Keyboard shortcuts must list only shortcuts the code handles. Each
 * entry is matched to the handler that implements it; a new entry needs a
 * handler here (and in the code), and removing a handler fails this test.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { KEYBOARD_SHORTCUTS, shortcutsForShell } from '../keyboard-shortcuts'
import { getAppVersion } from '@/lib/app-version'
import en from '@/lib/i18n/dictionaries/en.json'
import vi_ from '@/lib/i18n/dictionaries/vi.json'

const src = (p: string) => readFileSync(join(process.cwd(), 'src', p), 'utf8')

/** id -> [file, pattern that only the real handler matches]. */
const HANDLERS: Record<string, [string, RegExp]> = {
  'command-palette': [
    'context/search-provider.tsx',
    /e\.key === 'k' && \(e\.metaKey \|\| e\.ctrlKey\)/,
  ],
  'toggle-sidebar': [
    'components/ui/sidebar.tsx',
    /SIDEBAR_KEYBOARD_SHORTCUT = 'b'[\s\S]*event\.key === SIDEBAR_KEYBOARD_SHORTCUT && \(event\.metaKey \|\| event\.ctrlKey\)/,
  ],
  'switch-organization': [
    'components/layout/team-switcher.tsx',
    /\(event\.metaKey \|\| event\.ctrlKey\) \|\| !event\.shiftKey[\s\S]*Digit\(\[1-9\]\)/,
  ],
  'open-finding': [
    'features/findings/components/finding-detail-drawer.tsx',
    /\(e\.metaKey \|\| e\.ctrlKey\) && e\.key === 'Enter'/,
  ],
  'toggle-comment': [
    'features/findings/components/finding-detail-drawer.tsx',
    /\(e\.metaKey \|\| e\.ctrlKey\) && e\.key === 'c' && !e\.shiftKey/,
  ],
  'clear-selection': [
    'features/shared/components/bulk-action-bar.tsx',
    /e\.key === 'Escape' && !e\.defaultPrevented\) onClear\(\)/,
  ],
}

describe('keyboard shortcuts', () => {
  it('every listed shortcut has a real handler', () => {
    expect(KEYBOARD_SHORTCUTS.map((s) => s.id).sort()).toEqual(Object.keys(HANDLERS).sort())
    for (const s of KEYBOARD_SHORTCUTS) {
      const [file, pattern] = HANDLERS[s.id]
      expect(src(file), `${s.id} in ${file}`).toMatch(pattern)
    }
  })

  it('the admin console (no command palette, no organizations) lists only the sidebar toggle', () => {
    // The palette lives in SearchProvider, mounted by the dashboard layout only.
    expect(src('app/(dashboard)/layout.tsx')).toContain('<SearchProvider>')
    expect(shortcutsForShell('admin').map((s) => s.id)).toEqual(['toggle-sidebar'])
  })

  it('has en and vi strings for every shortcut and group', () => {
    const dicts = { en, vi: vi_ } as Record<string, Record<string, string>>
    for (const [locale, dict] of Object.entries(dicts)) {
      for (const s of KEYBOARD_SHORTCUTS) {
        expect(dict[`help.shortcut.${s.id}`], `${locale} help.shortcut.${s.id}`).toBeTruthy()
        expect(dict[`help.shortcutGroup.${s.group}`], `${locale} ${s.group}`).toBeTruthy()
      }
    }
    for (const s of KEYBOARD_SHORTCUTS)
      expect(en[`help.shortcut.${s.id}` as keyof typeof en]).toBe(s.label)
  })
})

describe('getAppVersion', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('reads the release version and short commit baked in at build time', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_VERSION', 'v0.9.0')
    vi.stubEnv('NEXT_PUBLIC_APP_COMMIT', '0123456789abcdef')
    expect(getAppVersion()).toEqual({ version: 'v0.9.0', commit: '0123456' })
  })

  it('reports nothing outside a release build (never package.json)', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_VERSION', '')
    vi.stubEnv('NEXT_PUBLIC_APP_COMMIT', '')
    expect(getAppVersion()).toEqual({ version: undefined, commit: undefined })
  })
})
