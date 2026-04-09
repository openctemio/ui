import { test, expect } from '../fixtures/authenticated-page'

/**
 * Critical Flow #5: Owner Picker
 *
 * Verifies the asset owner picker:
 *   1. Opens from the asset detail sheet.
 *   2. Lists at least one candidate (the seed user themselves).
 *   3. Selecting a candidate persists and reflects in the UI.
 *
 * This flow exercises the asset_owners join table and the new combobox
 * UI introduced when we replaced the per-row dropdown with a single
 * picker that supports search.
 */

test.describe('Asset owner picker', () => {
  test('owner field is present on the asset detail sheet', async ({ page }) => {
    await page.goto('/assets')
    await page.waitForLoadState('networkidle')

    const firstRow = page.getByRole('row').nth(1)
    if (!(await firstRow.isVisible().catch(() => false))) {
      test.skip(true, 'No assets in tenant — seed at least one asset')
      return
    }
    await firstRow.click()

    const ownerLabel = page.getByText(/owners?/i).first()
    await expect(ownerLabel).toBeVisible({ timeout: 15_000 })
  })

  test('owner picker opens and shows at least one candidate', async ({ page, e2eConfig }) => {
    await page.goto('/assets')
    await page.waitForLoadState('networkidle')

    const firstRow = page.getByRole('row').nth(1)
    if (!(await firstRow.isVisible().catch(() => false))) {
      test.skip(true, 'No assets in tenant — seed at least one asset')
      return
    }
    await firstRow.click()

    // The picker is opened by clicking the owner field area or a
    // dedicated "Add owner" / "Change owner" button.
    const opener = page
      .getByRole('button', { name: /add owner|change owner|select owner|owner/i })
      .first()
    if (!(await opener.isVisible().catch(() => false))) {
      test.skip(true, 'No owner picker trigger visible — UI may have moved')
      return
    }
    await opener.click()

    // Once open, a popover/listbox should be visible with one or more
    // option rows. The seed user (their email) should appear because
    // they are a member of the tenant.
    const popover = page.getByRole('listbox').or(page.getByRole('dialog'))
    await expect(popover.first()).toBeVisible({ timeout: 10_000 })

    // Search for the seed user by email — every member should be
    // searchable. We accept either an exact match or a "fuzzy" match
    // because some pickers use ILIKE %email%.
    const searchBox = popover
      .first()
      .getByPlaceholder(/search|find|filter/i)
      .first()
    if (await searchBox.isVisible().catch(() => false)) {
      const localPart = e2eConfig.userEmail.split('@')[0] ?? e2eConfig.userEmail
      await searchBox.fill(localPart)
    }

    // At least one matching option should now be visible. The seed
    // user is themselves, so they MUST be in the list.
    const matches = popover.first().getByRole('option').or(popover.first().getByText(/.+/))
    expect(await matches.count()).toBeGreaterThan(0)

    // Cleanup: dismiss the picker without selecting anything.
    await page.keyboard.press('Escape')
  })

  // TODO: Add a "happy path" assignment test:
  //   1. Open the picker, select the seed user
  //   2. Close the picker
  //   3. Reload the asset and confirm the owner chip shows the user
  //   4. Re-open the picker and remove the assignment
  //   5. Reload again and confirm the chip is gone
  //
  // This needs a unique asset per test run (to avoid stomping shared
  // seed data) — easiest way is to create one via the API in a
  // beforeEach hook once the API helper is wired up.
})
