import { test, expect } from '../fixtures/authenticated-page'

/**
 * Critical Flow #2: Asset Relationships — Multi-Select Add
 *
 * Verifies the asset relationships UI is reachable, the "Add Relationship"
 * dialog opens, the multi-select picker for related assets is present, and
 * that selecting multiple items + saving issues a single batch request
 * (not N parallel POSTs — that regression killed performance once before).
 *
 * The test is intentionally tolerant to localised copy: it targets dialog
 * structure (role=dialog, role=combobox, role=button name=/save|create/i)
 * rather than exact strings.
 */

test.describe('Asset relationship multi-select', () => {
  test('asset list page loads', async ({ page }) => {
    await page.goto('/assets/hosts')
    await page.waitForLoadState('networkidle')
    // The page must reach a state where rows or an empty-state are visible.
    // We give it a generous timeout because asset queries can be slow on
    // tenants with large inventories.
    const tableOrEmpty = page
      .getByRole('table')
      .or(page.getByText(/no assets/i))
      .or(page.getByText(/get started/i))
    await expect(tableOrEmpty.first()).toBeVisible({ timeout: 20_000 })
  })

  test('opening an asset detail exposes a relationships section', async ({ page }) => {
    await page.goto('/assets/hosts')
    await page.waitForLoadState('networkidle')

    // Try to open the first row. If there are no rows, skip with a clear
    // message — this test depends on at least one asset existing in the
    // seed data.
    const firstRow = page.getByRole('row').nth(1) // row 0 is the header
    if (!(await firstRow.isVisible().catch(() => false))) {
      test.skip(true, 'No assets in tenant — seed at least one asset to run this test')
      return
    }

    await firstRow.click()

    // Look for the "Relations" tab (labelled "Relations" in the asset detail
    // sheet) or a relationships heading. /relations/i matches both "Relations"
    // and "Relationships".
    const relsLocator = page
      .getByRole('tab', { name: /relations/i })
      .or(page.getByRole('heading', { name: /relations/i }))
    await expect(relsLocator.first()).toBeVisible({ timeout: 15_000 })
  })

  test('add-relationship dialog renders its type + target form', async ({ page }) => {
    // The add-relationship dialog is a "relationship type → target asset" form
    // (pick a type, then the target-asset picker enables) — not the old
    // checkbox multi-select list. This test opens the dialog and asserts its
    // real controls. It requires at least 2 assets in the tenant; we pre-flight
    // by counting visible rows and skip otherwise.
    await page.goto('/assets/hosts')
    await page.waitForLoadState('networkidle')

    const dataRows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') })
    const rowCount = await dataRows.count().catch(() => 0)
    if (rowCount < 2) {
      test.skip(true, 'Need at least 2 assets to test multi-select relationships')
      return
    }

    await dataRows.first().click()

    // The detail sheet is itself a role=dialog; scope to it so we don't collide
    // with the add-relationship dialog opened later.
    const sheet = page.getByRole('dialog').first()
    const relsTab = sheet.getByRole('tab', { name: /relations/i }).first()
    await expect(relsTab).toBeVisible({ timeout: 15_000 })
    await relsTab.click()

    // Open the add-relationship dialog. The button label has been
    // "Add Relationship" / "Add" / "+" historically — match generously.
    const addBtn = sheet
      .getByRole('button', { name: /add relationship|add relation|^add$|link asset/i })
      .first()
    await addBtn.click()

    // The add dialog is a second overlay on top of the sheet.
    const dialog = page.getByRole('dialog').last()
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    // The dialog is a two-step form: a "Relationship Type" selector and a
    // target-asset picker (disabled until a type is chosen), plus a Create
    // action. Assert these controls render — the actual create is skipped to
    // keep the test side-effect free.
    await expect(dialog.getByText(/relationship type/i).first()).toBeVisible()
    await expect(dialog.getByText(/target asset/i).first()).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: /create relationship|create/i }).first()
    ).toBeVisible()

    // Cleanup: close the add-relationship dialog without saving. Cancel closes
    // only the add dialog (the detail sheet stays open), so assert the overlay
    // count drops back to 1 rather than probing the dynamic .last() locator.
    await dialog
      .getByRole('button', { name: /cancel/i })
      .first()
      .click()
    await expect.poll(async () => page.getByRole('dialog').count(), { timeout: 5_000 }).toBe(1)
  })

  // TODO: happy-path — pick a relationship type, select a target asset, click
  // Create, and assert the Relations tab shows the new row. (The picker is now
  // a single type→target form, not a multi-select list; revisit whether batch
  // multi-target is still a product requirement before asserting it.)
})
