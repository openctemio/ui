import { request } from '@playwright/test'
import { test, expect } from '../fixtures/authenticated-page'
import { LEGACY_VALIDATION_ROUTE_REDIRECTS } from '../../src/config/legacy-routes'

/**
 * Validation, campaign-first (two levels: group, then item).
 *
 *   1. Every Validation entry in the sidebar opens a page with one h1 and no
 *      Access Denied.
 *   2. Every old pentest list URL answers 308 to its new home.
 */

test('every Validation entry opens', async ({ page }) => {
  await page.goto('/validation')
  await expect(page.getByRole('heading', { level: 1, name: 'Validation' })).toBeVisible({
    timeout: 30_000,
  })
  const hrefs = await page
    .locator('[data-sidebar="content"] a')
    .evaluateAll((as) =>
      as
        .map((a) => a.getAttribute('href') ?? '')
        .filter((h) =>
          /^\/(validation|pentest\/campaigns|attack-simulation|control-testing)/.test(h)
        )
    )
  expect(hrefs).toContain('/validation/retests')
  for (const href of hrefs) {
    await page.goto(href)
    await expect(page.locator('h1'), href).toHaveCount(1, { timeout: 30_000 })
    await expect(page.getByText('Access Denied'), href).toHaveCount(0)
  }
})

test('old pentest list URLs answer 308', async ({ e2eConfig }) => {
  const ctx = await request.newContext({ baseURL: e2eConfig.baseURL })
  for (const r of LEGACY_VALIDATION_ROUTE_REDIRECTS) {
    const from = r.source.replace('/:path*', '')
    const q = new URLSearchParams({ e2e: '1' })
    for (const h of r.has ?? []) q.set(h.key, h.value ?? 'c1')
    const res = await ctx.get(`${from}?${q}`, { maxRedirects: 0 })
    expect(res.status(), from).toBe(308)
    const expected = r.destination.replace('/:path*', '').replace(':campaign', 'c1').split('?')[0]
    expect((res.headers()['location'] ?? '').split('?')[0], from).toBe(expected)
  }
  await ctx.dispose()
})
