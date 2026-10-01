import { test as base } from '@playwright/test'
import { test, expect } from '../fixtures/authenticated-page'
import { loginAs } from '../helpers/auth'
import { getE2EConfig } from '../helpers/env'

/**
 * Landmarks and accessible names.
 *
 * Regressions this guards:
 *   1. Every dashboard page had two nested `main` landmarks (the layout's
 *      and the page's <Main>).
 *   2. The Access Denied view had no `main` landmark and no #content, so
 *      "Skip to Main" led nowhere.
 *   3. The "Require two-factor authentication" switch had no accessible name.
 *
 * The Access Denied check needs a user without team:update (a member or
 * viewer): set E2E_LIMITED_EMAIL / E2E_LIMITED_PASSWORD, or it is skipped.
 */

test.describe('Landmarks', () => {
  test('dashboard pages have exactly one main landmark, and it is #content', async ({ page }) => {
    for (const path of ['/', '/findings', '/sensors', '/settings/general']) {
      await page.goto(path)
      await expect(page.locator('main#content'), path).toHaveCount(1, { timeout: 30_000 })
      await expect(page.getByRole('main'), path).toHaveCount(1)
    }
  })
})

base.describe('Access denied view', () => {
  base('is the main landmark and the skip link target', async ({ page }) => {
    const cfg = getE2EConfig()
    const email = process.env.E2E_LIMITED_EMAIL
    const password = process.env.E2E_LIMITED_PASSWORD
    base.skip(!cfg.ok || !email || !password, 'Set E2E_LIMITED_EMAIL / E2E_LIMITED_PASSWORD')
    if (!cfg.ok) return

    await loginAs(page, { ...cfg.config, userEmail: email!, userPassword: password! })
    await page.goto('/settings/general')
    await expect(page.getByText('Access Denied', { exact: true })).toBeVisible({ timeout: 30_000 })

    await expect(page.getByRole('main')).toHaveCount(1)
    await expect(page.locator('main#content')).toContainText('Access Denied')

    // The skip link is the first stop and lands on the denied view.
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to Main' })).toBeFocused()
  })
})

test.describe('Organization authentication settings', () => {
  test('the two-factor switch has an accessible name', async ({ page }) => {
    await page.goto('/settings/authentication')
    await expect(
      page.getByRole('switch', { name: 'Require two-factor authentication' })
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('switch', { name: 'Restricted data scope' })).toBeVisible()
  })
})
