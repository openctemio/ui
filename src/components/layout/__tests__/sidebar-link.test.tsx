import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'

// Record the prefetch mode each render hands to next/link, and let a test set
// the link status that useLinkStatus reports.
const linkProps: Array<{ prefetch: unknown }> = []
let pending = false
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ prefetch, children, ...props }: ComponentProps<'a'> & { prefetch?: unknown }) => {
    linkProps.push({ prefetch })
    return <a {...props}>{children}</a>
  },
  useLinkStatus: () => ({ pending }),
}))

import { NavPendingHint, SidebarLink } from '../sidebar-link'
import { NavProgressBar, navPendingStore } from '../nav-progress'

const lastPrefetch = () => linkProps[linkProps.length - 1].prefetch

describe('SidebarLink', () => {
  beforeEach(() => {
    linkProps.length = 0
    pending = false
  })

  it('does not prefetch until the user shows intent', () => {
    render(<SidebarLink href="/findings">Findings</SidebarLink>)
    expect(lastPrefetch()).toBe(false)
  })

  it.each([
    ['hover', (el: HTMLElement) => fireEvent.mouseEnter(el)],
    ['focus', (el: HTMLElement) => fireEvent.focus(el)],
    ['touch', (el: HTMLElement) => fireEvent.touchStart(el)],
  ])('arms the default prefetch on %s', (_, act) => {
    render(<SidebarLink href="/findings">Findings</SidebarLink>)
    act(screen.getByRole('link', { name: 'Findings' }))
    expect(lastPrefetch()).toBeNull()
  })

  it('still calls the caller handlers', () => {
    const onMouseEnter = vi.fn()
    const onFocus = vi.fn()
    render(
      <SidebarLink href="/findings" onMouseEnter={onMouseEnter} onFocus={onFocus}>
        Findings
      </SidebarLink>
    )
    const link = screen.getByRole('link', { name: 'Findings' })
    fireEvent.mouseEnter(link)
    fireEvent.focus(link)
    expect(onMouseEnter).toHaveBeenCalledOnce()
    expect(onFocus).toHaveBeenCalledOnce()
  })
})

describe('NavPendingHint', () => {
  beforeEach(() => {
    pending = false
  })

  it('is inert while the link is idle', () => {
    const { container } = render(<NavPendingHint />)
    const hint = container.querySelector('span')!
    expect(hint.className).toBe('nav-pending-hint')
    expect(hint.hasAttribute('data-nav-pending')).toBe(false)
    expect(hint.getAttribute('aria-hidden')).toBe('true')
    expect(navPendingStore.isPending()).toBe(false)
  })

  it('marks its row and turns the top bar on while pending, off when done', () => {
    pending = true
    const { container, unmount } = render(
      <>
        <NavPendingHint />
        <NavProgressBar />
      </>
    )
    expect(container.querySelector('.nav-pending-hint')!.getAttribute('data-nav-pending')).toBe(
      'true'
    )
    expect(navPendingStore.isPending()).toBe(true)
    expect(container.querySelector('.nav-progress')!.getAttribute('data-active')).toBe('true')
    unmount()
    expect(navPendingStore.isPending()).toBe(false)
  })

  it('quiet: draws nothing in the link but still drives the top bar', () => {
    pending = true
    const { container, unmount } = render(<NavPendingHint quiet />)
    expect(container.innerHTML).toBe('')
    expect(navPendingStore.isPending()).toBe(true)
    unmount()
    expect(navPendingStore.isPending()).toBe(false)
  })
})

describe('navPendingStore', () => {
  it('stays pending until every link is done, and a done callback counts once', () => {
    const a = navPendingStore.begin()
    const b = navPendingStore.begin()
    a()
    a()
    expect(navPendingStore.isPending()).toBe(true)
    b()
    expect(navPendingStore.isPending()).toBe(false)
  })

  it('re-renders the bar when the count changes', () => {
    const { container } = render(<NavProgressBar />)
    const bar = () => container.querySelector('.nav-progress')!
    expect(bar().hasAttribute('data-active')).toBe(false)
    let done = () => {}
    act(() => {
      done = navPendingStore.begin()
    })
    expect(bar().getAttribute('data-active')).toBe('true')
    act(() => done())
    expect(bar().hasAttribute('data-active')).toBe(false)
  })
})
