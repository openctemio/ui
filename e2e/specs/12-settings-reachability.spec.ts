import { test as base, request } from '@playwright/test'
import { test, expect } from '../fixtures/authenticated-page'
import { loginAs } from '../helpers/auth'
import { getE2EConfig } from '../helpers/env'
import { LEGACY_SETTINGS_ROUTE_REDIRECTS } from '../../src/config/legacy-routes'

/**
 * Settings reachability (Settings IA).
 *
 *   1. As the seed user (an owner or admin): every settings-rail entry opens
 *      a page with one h1, the rail, and no Access Denied.
 *   2. Every moved settings URL answers 308 to its new home, query kept.
 *   3. Cmd+K finds settings pages.
 *   4. As a member or viewer (E2E_LIMITED_EMAIL / E2E_LIMITED_PASSWORD): the
 *      user menu's settings link and the user's own notifications open, and
 *      admin-only entries are not in the rail.
 */

const rail = '[data-sidebar="content"] nav'

test('every settings rail entry opens', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible({
    timeout: 30_000,
  })
  // Every rail link except "Back to app" (its target is an app page).
  const hrefs = await page
    .locator(`${rail} a`)
    .evaluateAll((as) =>
      as
        .filter((a) => !(a.textContent ?? '').includes('Back to app'))
        .map((a) => a.getAttribute('href') ?? '')
    )
  expect(hrefs.length).toBeGreaterThan(20)

  for (const href of hrefs) {
    await page.goto(href)
    await expect(page.locator(rail), href).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('h1'), href).toHaveCount(1)
    await expect(page.getByText('Access Denied'), href).toHaveCount(0)
    await expect(page.locator(`${rail} a[aria-current="page"]`), href).toHaveCount(1)
  }
})

for (const collapsed of [false, true]) {
  test(`Back to app returns to the last app page (sidebar ${collapsed ? 'collapsed' : 'expanded'})`, async ({
    page,
    context,
    e2eConfig,
  }) => {
    // The sidebar reads its state from this cookie on the server.
    await context.addCookies([
      { name: 'sidebar_state', value: String(!collapsed), url: e2eConfig.baseURL },
    ])
    await page.goto('/findings')
    await expect(page.locator('h1')).toHaveCount(1, { timeout: 30_000 })
    await page.goto('/settings/members')
    await expect(page.locator(rail)).toBeVisible({ timeout: 30_000 })
    const back = page.locator(rail).getByRole('link', { name: 'Back to app' })
    if (collapsed) {
      // Collapsed: icon only, with its label as a tooltip.
      await back.hover()
      await expect(page.getByRole('tooltip', { name: 'Back to app' })).toBeVisible()
    }
    await back.click()
    await expect(page).toHaveURL(/\/findings$/)
    // Keyboard: focus it and press Enter.
    await page.goto('/settings/members')
    await page.locator(rail).getByRole('link', { name: 'Back to app' }).focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/findings$/)
  })
}

test('moved settings URLs answer 308 with the query kept', async ({ e2eConfig }) => {
  const ctx = await request.newContext({ baseURL: e2eConfig.baseURL })
  for (const r of LEGACY_SETTINGS_ROUTE_REDIRECTS) {
    const from = r.source.replace('/:path*', '')
    const q = new URLSearchParams({ e2e: '1' })
    for (const h of r.has ?? []) q.set(h.key, h.value ?? 'x')
    const res = await ctx.get(`${from}?${q}`, { maxRedirects: 0 })
    expect(res.status(), from).toBe(308)
    const location = res.headers()['location'] ?? ''
    expect(location, from).toContain('e2e=1')
    expect(location.split('?')[0], from).toBe(r.destination.replace('/:path*', '').split('?')[0])
  }
  await ctx.dispose()
})

test('Cmd+K finds settings pages', async ({ page }) => {
  await page.goto('/')
  for (const [query, label] of [
    ['api keys', 'API keys'],
    ['audit', 'Audit log'],
    ['members', 'Members'],
  ]) {
    await page.keyboard.press('Control+k')
    const input = page.getByPlaceholder('Type a command or search...')
    await input.fill(query)
    await expect(page.locator('[cmdk-item]').first(), query).toContainText(label)
    await page.keyboard.press('Escape')
  }
})

base('a member opens their own settings and sees no admin entries', async ({ page }) => {
  const cfg = getE2EConfig()
  const email = process.env.E2E_LIMITED_EMAIL
  const password = process.env.E2E_LIMITED_PASSWORD
  base.skip(!cfg.ok || !email || !password, 'Set E2E_LIMITED_EMAIL / E2E_LIMITED_PASSWORD')
  if (!cfg.ok) return

  await loginAs(page, { ...cfg.config, userEmail: email!, userPassword: password! })

  await page.getByRole('button', { name: 'Open user menu' }).click()
  await page.getByRole('menuitem', { name: 'Notifications' }).click()
  await expect(page).toHaveURL(/\/account\/notifications/)
  await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible()
  await expect(page.getByText('Access Denied')).toHaveCount(0)

  await page.getByRole('button', { name: 'Open user menu' }).click()
  await page.getByRole('menuitem', { name: 'All settings' }).click()
  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByText('Access Denied')).toHaveCount(0)
  // Owner/admin-only entries are hidden, not shown and refused.
  for (const adminOnly of ['/settings/general', '/settings/modules']) {
    await expect(page.locator(`${rail} a[href="${adminOnly}"]`), adminOnly).toHaveCount(0)
  }
})
