'use client'

import { Fragment, useSyncExternalStore } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTranslation } from '@/context/i18n-provider'
import {
  KEYBOARD_SHORTCUT_GROUPS,
  shortcutsForShell,
  type KeyboardShortcut,
  type ShortcutKey,
  type ShortcutShell,
} from '@/config/keyboard-shortcuts'

const subscribeNoop = () => () => {}

/** macOS / iOS show Cmd and the Shift glyph; everything else Ctrl and Shift. */
function useIsApple(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent),
    () => false
  )
}

function keyLabel(key: ShortcutKey, apple: boolean): string {
  if (key === 'mod') return apple ? '⌘' : 'Ctrl'
  if (key === 'shift') return apple ? '⇧' : 'Shift'
  if (key === 'esc') return 'Esc'
  return key
}

/** One key cap, the same look as the ⌘K hint on the search button. */
function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border bg-muted px-1.5 font-sans text-xs font-medium text-muted-foreground">
      {children}
    </kbd>
  )
}

export function ShortcutKeys({ keys }: { keys: ShortcutKey[] }) {
  const apple = useIsApple()
  return (
    <span className="flex shrink-0 items-center gap-1" dir="ltr">
      {keys.map((k, i) => (
        <Fragment key={k}>
          {i > 0 && !apple && <span className="text-xs text-muted-foreground">+</span>}
          <Kbd>{keyLabel(k, apple)}</Kbd>
        </Fragment>
      ))}
    </span>
  )
}

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Lists only what works in this shell. */
  shell: ShortcutShell
}

/** Help > Keyboard shortcuts: the shortcuts in src/config/keyboard-shortcuts.ts. */
export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  shell,
}: KeyboardShortcutsDialogProps) {
  const { t } = useTranslation()
  const shortcuts = shortcutsForShell(shell)
  const groups = (Object.keys(KEYBOARD_SHORTCUT_GROUPS) as KeyboardShortcut['group'][])
    .map((group) => ({ group, items: shortcuts.filter((s) => s.group === group) }))
    .filter((g) => g.items.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('help.shortcuts', 'Keyboard shortcuts')}</DialogTitle>
          <DialogDescription>
            {t('help.shortcuts.description', 'Work faster without leaving the keyboard.')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {groups.map(({ group, items }) => (
            <section key={group} aria-labelledby={`shortcut-group-${group}`}>
              <h3 id={`shortcut-group-${group}`} className="mb-2 text-sm font-semibold">
                {t(`help.shortcutGroup.${group}`, KEYBOARD_SHORTCUT_GROUPS[group])}
              </h3>
              <ul className="divide-y rounded-md border">
                {items.map((s) => (
                  <li
                    key={s.id}
                    data-shortcut={s.id}
                    className="flex items-center justify-between gap-4 px-3 py-2 text-sm"
                  >
                    <span>{t(`help.shortcut.${s.id}`, s.label)}</span>
                    <ShortcutKeys keys={s.keys} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
