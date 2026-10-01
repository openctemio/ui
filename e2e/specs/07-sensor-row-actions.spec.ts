import type { Page } from '@playwright/test'
import { test, expect } from '../fixtures/authenticated-page'

/**
 * Sensor row actions act on the row they were picked from.
 *
 * Regression: the activate/deactivate mutations were bound to the sheet's
 * selected sensor. A row action selects its sensor and triggers in the same
 * handler, before React re-renders, so it hit the PREVIOUSLY selected sensor
 * (after viewing A, "Deactivate" on B disabled A while the toast named B),
 * or no sensor at all ("Can't trigger the mutation: missing key").
 *
 * Needs a tenant with at least two active sensors. The test restores what it
 * changes.
 */

const rowFor = (page: Page, name: string) =>
  page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) })

async function openSensors(page: Page) {
  await page.goto('/sensors')
  await expect(page.getByRole('heading', { name: 'Sensors', level: 1 })).toBeVisible()
  await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 30_000 })
}

/** Names of up to `n` sensors whose row offers "Deactivate" (status active). */
async function activeSensorNames(page: Page, n: number): Promise<string[]> {
  const names: string[] = []
  const rows = page.getByRole('row')
  const count = await rows.count()
  for (let i = 1; i < count && names.length < n; i++) {
    const row = rows.nth(i)
    if ((await row.getByText(/^(Disabled|Revoked)$/).count()) > 0) continue
    const name = (await row.locator('p.font-medium').first().innerText()).trim()
    if (name) names.push(name)
  }
  return names
}

async function rowAction(page: Page, name: string, action: string) {
  await rowFor(page, name).getByRole('button', { name: 'Open row actions' }).click()
  await page.getByRole('menuitem', { name: action, exact: true }).click()
}

async function expectStatus(page: Page, name: string, disabled: boolean) {
  const badge = rowFor(page, name).getByText('Disabled', { exact: true })
  if (disabled) await expect(badge).toBeVisible({ timeout: 15_000 })
  else await expect(badge).toHaveCount(0, { timeout: 15_000 })
}

test.describe('Sensor row actions', () => {
  test('Deactivate from the row menu acts on that row, not the last viewed sensor', async ({
    page,
  }) => {
    await openSensors(page)
    const [a, b] = await activeSensorNames(page, 2)
    test.skip(!a || !b, 'Needs two active sensors')

    // View A in the detail sheet, then close it: A becomes the selection.
    await rowFor(page, a).getByText(a, { exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()

    await rowAction(page, b, 'Deactivate')
    await expect(page.getByText(`Sensor "${b}" deactivated`)).toBeVisible()

    await page.reload()
    await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 30_000 })
    await expectStatus(page, b, true)
    await expectStatus(page, a, false)

    // Activate B back from its row (A is still the selection).
    await rowAction(page, b, 'Activate')
    await expect(page.getByText(`Sensor "${b}" activated`)).toBeVisible()
    await page.reload()
    await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 30_000 })
    await expectStatus(page, b, false)
    await expectStatus(page, a, false)
  })

  test('Deactivate works with nothing selected yet', async ({ page }) => {
    await openSensors(page)
    const [b] = await activeSensorNames(page, 1)
    test.skip(!b, 'Needs an active sensor')

    await rowAction(page, b, 'Deactivate')
    await expect(page.getByText(`Sensor "${b}" deactivated`)).toBeVisible()
    await expect(page.getByText(/missing key/i)).toHaveCount(0)

    await page.reload()
    await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 30_000 })
    await expectStatus(page, b, true)

    await rowAction(page, b, 'Activate')
    await expect(page.getByText(`Sensor "${b}" activated`)).toBeVisible()
  })

  test('the new sensor key is labelled, and so are its show and copy buttons', async ({ page }) => {
    const name = `e2e-key-a11y-${Date.now()}`
    await openSensors(page)
    await page.getByRole('button', { name: 'Add sensor' }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Name').fill(name)
    await dialog.getByRole('button', { name: 'Next' }).click()
    await dialog.getByRole('button', { name: 'Create Sensor' }).click()

    const key = dialog.getByLabel('API key', { exact: true })
    await expect(key).toBeVisible()
    await expect(key).toHaveAttribute('type', 'password')
    await dialog.getByRole('button', { name: 'Show API key' }).click()
    await expect(key).toHaveAttribute('type', 'text')
    await expect(dialog.getByRole('button', { name: 'Hide API key' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Copy API key' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Done' }).click()

    // Clean up the sensor this test created.
    await expect(rowFor(page, name)).toBeVisible({ timeout: 30_000 })
    await rowAction(page, name, 'Delete')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
    await expect(rowFor(page, name)).toHaveCount(0, { timeout: 15_000 })
  })
})
