/**
 * The keyboard shortcuts the app actually handles, listed by Help > Keyboard
 * shortcuts. Only shortcuts with a real handler belong here:
 * src/config/__tests__/keyboard-shortcuts.test.ts checks each entry against the
 * code that implements it, so a shortcut cannot be advertised without existing
 * (or keep being advertised after its handler is removed).
 */

/**
 * A key in a combination. `mod` is Cmd on macOS and Ctrl elsewhere, `shift` is
 * Shift; anything else is shown as written ("K", "Enter", "1-9").
 */
export type ShortcutKey = 'mod' | 'shift' | 'esc' | (string & {})

/** Where the shortcut works. The admin console has no palette or org switcher. */
export type ShortcutShell = 'app' | 'admin'

export interface KeyboardShortcut {
  /** Stable id. i18n key: `help.shortcut.<id>`. */
  id: string
  /** English description, sentence case. */
  label: string
  keys: ShortcutKey[]
  /** i18n key: `help.shortcutGroup.<group>`. */
  group: 'general' | 'findings' | 'lists'
  shells: ShortcutShell[]
}

export const KEYBOARD_SHORTCUT_GROUPS: Record<KeyboardShortcut['group'], string> = {
  general: 'General',
  findings: 'Finding details',
  lists: 'Lists',
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'command-palette',
    label: 'Search pages and settings',
    keys: ['mod', 'K'],
    group: 'general',
    shells: ['app'],
  },
  {
    id: 'toggle-sidebar',
    label: 'Show or hide the sidebar',
    keys: ['mod', 'B'],
    group: 'general',
    shells: ['app', 'admin'],
  },
  {
    id: 'switch-organization',
    label: 'Switch to organization 1-9',
    keys: ['mod', 'shift', '1-9'],
    group: 'general',
    shells: ['app'],
  },
  {
    id: 'open-finding',
    label: 'Open the full finding page',
    keys: ['mod', 'Enter'],
    group: 'findings',
    shells: ['app'],
  },
  {
    id: 'toggle-comment',
    label: 'Add a comment (when no text is selected)',
    keys: ['mod', 'C'],
    group: 'findings',
    shells: ['app'],
  },
  {
    id: 'clear-selection',
    label: 'Clear the selected rows',
    keys: ['esc'],
    group: 'lists',
    shells: ['app'],
  },
]

/** The shortcuts that work in `shell`, in display order. */
export function shortcutsForShell(shell: ShortcutShell): KeyboardShortcut[] {
  return KEYBOARD_SHORTCUTS.filter((s) => s.shells.includes(shell))
}
