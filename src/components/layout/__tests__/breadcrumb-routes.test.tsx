import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { PATHS_WITHOUT_PAGE, breadcrumbHasPage } from '../breadcrumb-routes'

const pathname = vi.hoisted(() => ({ current: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const { BreadcrumbNav } = await import('../breadcrumb-nav')

const APP_DIR = join(process.cwd(), 'src', 'app')

/** Every page route in src/app: route groups removed, dynamic segments as [id]. */
function pageRoutes(dir = APP_DIR, segments: string[] = [], out = new Set<string>()) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === 'api' && segments.length === 0) continue // route handlers, not pages
      const next = /^\(.*\)$/.test(name)
        ? segments
        : [...segments, /^\[.*\]$/.test(name) ? '[id]' : name]
      pageRoutes(full, next, out)
    } else if (name === 'page.tsx') {
      out.add('/' + segments.join('/'))
    }
  }
  return out
}

describe('PATHS_WITHOUT_PAGE', () => {
  it('lists exactly the parent paths in src/app that have no page', () => {
    const pages = pageRoutes()
    const parents = new Set<string>()
    for (const route of pages) {
      const parts = route.split('/').filter(Boolean)
      for (let i = 1; i < parts.length; i++) parents.add('/' + parts.slice(0, i).join('/'))
    }
    const withoutPage = [...parents].filter((p) => !pages.has(p)).sort()
    expect([...PATHS_WITHOUT_PAGE].sort()).toEqual(withoutPage)
  })

  it('matches id segments in a real URL', () => {
    expect(breadcrumbHasPage('/insights')).toBe(false)
    expect(breadcrumbHasPage('/pipelines/01a0f683-d491-7143-b9b7-6e2b70490c0e')).toBe(false)
    expect(breadcrumbHasPage('/findings')).toBe(true)
    expect(breadcrumbHasPage('/settings')).toBe(true)
  })
})

describe('BreadcrumbNav', () => {
  beforeEach(() => {
    pathname.current = '/'
  })

  it('does not link a parent that has no page', () => {
    pathname.current = '/settings/access-control/groups'
    render(<BreadcrumbNav />)
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
    expect(screen.queryByRole('link', { name: 'Access control' })).toBeNull()
    expect(screen.getByText('Access control')).toBeInTheDocument()
  })

  it('does not link the id segment of a nested detail route without a page', () => {
    pathname.current = '/pipelines/01a0f683-d491-7143-b9b7-6e2b70490c0e/builder'
    const { container } = render(<BreadcrumbNav />)
    // The current page renders role="link" without an href; count real links only.
    const links = [...container.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'))
    expect(links).not.toContain('/pipelines/01a0f683-d491-7143-b9b7-6e2b70490c0e')
    expect(links).toContain('/pipelines')
  })

  it('leaves only the home link when no parent has a page', () => {
    pathname.current = '/insights/reports/scheduled'
    const { container } = render(<BreadcrumbNav />)
    // The current page renders role="link" without an href; count real links only.
    const links = [...container.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'))
    expect(links).toEqual(['/'])
  })

  it('still links a parent that has a page', () => {
    pathname.current = '/findings/01a0f683-cf13-731d-bee0-fcbf80eb3217'
    render(<BreadcrumbNav />)
    expect(screen.getByRole('link', { name: 'Findings' })).toHaveAttribute('href', '/findings')
  })
})
