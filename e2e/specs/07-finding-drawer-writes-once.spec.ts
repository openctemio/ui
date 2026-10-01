import { test, expect } from '../fixtures/authenticated-page'

/**
 * Critical Flow #7: the findings quick-view drawer
 *
 * Regressions this guards:
 *   1. Changing a finding's status in the drawer sent the PATCH twice (the
 *      drawer wrote it, then the page's callback wrote it again) and showed
 *      two toasts. Severity and assignee did the same.
 *   2. The drawer's "Affected Assets" labelled every asset "repository"
 *      (the list hard-coded the type), so a website or host finding read as
 *      a code finding.
 */

test.describe('Finding drawer', () => {
  test('a status change is written once', async ({ page }) => {
    await page.goto('/findings')
    await page.waitForLoadState('networkidle')

    // A finding not yet triaged, so "Confirmed" is a valid next status.
    const open = page
      .locator('tbody tr')
      .filter({ hasNotText: /Confirmed|In progress|Resolved|Duplicate|False positive/i })
      .first()
      .getByRole('button', { name: /, view details$/ })
    if (!(await open.isVisible().catch(() => false))) {
      test.skip(true, 'No finding in "New" — seed findings to enable this test')
      return
    }
    await open.click()
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()

    const statusButton = drawer.getByRole('button', { name: /^New$/ }).first()
    if (!(await statusButton.isVisible().catch(() => false))) {
      test.skip(true, 'The first finding is not "New" — reset seed data to enable this test')
      return
    }

    const patches: string[] = []
    page.on('request', (r) => {
      if (r.method() === 'PATCH' && /\/api\/v1\/findings\/[^/]+\/status$/.test(r.url())) {
        patches.push(r.url())
      }
    })

    await statusButton.click()
    await page
      .getByRole('menuitem', { name: /confirmed/i })
      .first()
      .click()
    await expect(drawer.getByRole('button', { name: /^Confirmed$/ }).first()).toBeVisible()
    await page.waitForLoadState('networkidle')

    expect(patches).toHaveLength(1)
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(1)
  })

  test('affected asset shows its real type', async ({ page }) => {
    await page.goto('/findings')
    await page.waitForLoadState('networkidle')

    const rows = page.locator('tbody tr')
    if ((await rows.count()) === 0) {
      test.skip(true, 'No findings — seed findings to enable this test')
      return
    }
    // Capture the API's asset type for the first finding, then compare with
    // the badge the drawer renders.
    const listResponse = page.waitForResponse((r) => /\/api\/v1\/findings\?/.test(r.url()))
    await page.reload()
    const body = (await (await listResponse).json()) as {
      data?: Array<{ asset?: { type?: string } }>
    }
    const apiType = body.data?.[0]?.asset?.type
    if (!apiType) {
      test.skip(true, 'First finding has no asset in the response')
      return
    }

    await page
      .getByRole('button', { name: /, view details$/ })
      .first()
      .click()
    const drawer = page.getByRole('dialog')
    await expect(drawer.getByText(apiType, { exact: true }).first()).toBeVisible()
  })
})
