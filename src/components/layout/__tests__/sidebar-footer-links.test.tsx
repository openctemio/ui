import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePathname } from 'next/navigation'
import { SidebarProvider } from '@/components/ui/sidebar'
import { SidebarFooterLinks } from '../sidebar-footer-links'
import { DOCS_URL, REPORT_ISSUE_URL } from '@/config/help-links'
import { KEYBOARD_SHORTCUTS, shortcutsForShell } from '@/config/keyboard-shortcuts'

// Radix menus measure their trigger; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderFooter(props: Parameters<typeof SidebarFooterLinks>[0], defaultOpen = true) {
  return render(
    <SidebarProvider defaultOpen={defaultOpen}>
      <SidebarFooterLinks {...props} />
    </SidebarProvider>
  )
}

const settingsLink = () => screen.getByRole('link', { name: 'Settings' })

describe('SidebarFooterLinks', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/findings')
  })

  it('renders Settings and Help as sidebar rows under a separator', () => {
    const { container } = renderFooter({ shell: 'app', showSettings: true })
    const footer = container.querySelector('[data-sidebar="footer"]')!
    expect(footer).toBeTruthy()
    expect(footer.querySelector('[data-slot="separator"], [role="none"], hr')).toBeTruthy()
    expect(settingsLink()).toHaveAttribute('href', '/settings')
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument()
    // Same row component as the nav (SidebarMenuButton).
    for (const row of [settingsLink(), screen.getByRole('button', { name: 'Help' })]) {
      expect(row).toHaveAttribute('data-sidebar', 'menu-button')
    }
  })

  it.each(['/settings', '/settings/members', '/settings/scanning/profiles/1', '/account/security'])(
    'marks Settings active on %s',
    (path) => {
      vi.mocked(usePathname).mockReturnValue(path)
      renderFooter({ shell: 'app', showSettings: true })
      expect(settingsLink()).toHaveAttribute('data-active', 'true')
    }
  )

  it.each(['/', '/findings', '/scan-profiles-x', '/settingsx'])(
    'does not mark Settings active on %s',
    (path) => {
      vi.mocked(usePathname).mockReturnValue(path)
      renderFooter({ shell: 'app', showSettings: true })
      expect(settingsLink()).toHaveAttribute('data-active', 'false')
    }
  )

  it('keeps both rows (icon + tooltip) on the collapsed rail', () => {
    renderFooter({ shell: 'app', showSettings: true }, false)
    expect(settingsLink().querySelector('svg')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Help' }).querySelector('svg')).toBeTruthy()
  })

  it('the admin console footer has Help but no tenant Settings, plus its own rows', () => {
    render(
      <SidebarProvider>
        <SidebarFooterLinks shell="admin">
          <li>Sign out row</li>
        </SidebarFooterLinks>
      </SidebarProvider>
    )
    expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument()
    expect(screen.getByText('Sign out row')).toBeInTheDocument()
  })

  it('Help opens a menu with docs, shortcuts, issue tracker and about', async () => {
    const user = userEvent.setup()
    renderFooter({ shell: 'app', showSettings: true })
    await user.click(screen.getByRole('button', { name: 'Help' }))
    const menu = await screen.findByRole('menu')
    const items = within(menu).getAllByRole('menuitem')
    expect(items.map((i) => i.textContent?.replace('(opens in a new tab)', '').trim())).toEqual([
      'Documentation',
      'Keyboard shortcuts',
      'Report an issue',
      'About OpenCTEM',
    ])

    const docs = within(menu).getByRole('menuitem', { name: /Documentation/ })
    expect(docs).toHaveAttribute('href', DOCS_URL)
    expect(docs).toHaveAttribute('target', '_blank')
    expect(docs.getAttribute('rel')).toContain('noopener')

    const issue = within(menu).getByRole('menuitem', { name: /Report an issue/ })
    expect(issue).toHaveAttribute('href', REPORT_ISSUE_URL)
    expect(issue).toHaveAttribute('target', '_blank')
    expect(issue.getAttribute('rel')).toContain('noopener')
  })

  it('Keyboard shortcuts lists exactly the configured shortcuts for the shell', async () => {
    const user = userEvent.setup()
    renderFooter({ shell: 'app', showSettings: true })
    await user.click(screen.getByRole('button', { name: 'Help' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Keyboard shortcuts' }))
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
    const listed = Array.from(dialog.querySelectorAll('[data-shortcut]')).map((el) =>
      el.getAttribute('data-shortcut')
    )
    expect(listed).toEqual(shortcutsForShell('app').map((s) => s.id))
    expect(listed).toEqual(KEYBOARD_SHORTCUTS.map((s) => s.id))
    expect(within(dialog).getByText('Show or hide the sidebar')).toBeInTheDocument()
  })

  it('the admin console lists only what works there (no palette, no org switch)', async () => {
    const user = userEvent.setup()
    renderFooter({ shell: 'admin' })
    await user.click(screen.getByRole('button', { name: 'Help' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Keyboard shortcuts' }))
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
    const listed = Array.from(dialog.querySelectorAll('[data-shortcut]')).map((el) =>
      el.getAttribute('data-shortcut')
    )
    expect(listed).toEqual(['toggle-sidebar'])
  })

  it('About shows the build version, or says it is a development build', async () => {
    const user = userEvent.setup()
    renderFooter({ shell: 'app', showSettings: true })
    await user.click(screen.getByRole('button', { name: 'Help' }))
    await user.click(await screen.findByRole('menuitem', { name: 'About OpenCTEM' }))
    const dialog = await screen.findByRole('dialog', { name: 'About OpenCTEM' })
    expect(within(dialog).getByTestId('about-ui-version')).toHaveTextContent('Development build')
  })
})
