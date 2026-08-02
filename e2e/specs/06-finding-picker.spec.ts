import { test, expect } from '../fixtures/authenticated-page'

/**
 * Findings picker inside the remediation task drawer.
 *
 * Regression guard for the picker rework: the picker is an INLINE view that
 * replaces the drawer body (not a portaled Popover/Dialog/fixed panel), so it
 * scrolls via the Sheet's own overflow-y-auto — the only approach that touch-
 * scrolls on iPad (portaled overlays are blocked by the Sheet's
 * react-remove-scroll; a fixed child is trapped by the Sheet containing block).
 *
 * Verifies: open task drawer → Manage → inline "Link findings" panel renders →
 * open-findings count shows → list is scrollable → server-side search filters →
 * toggling a row flips its checkbox → Done returns to task details.
 */
test.describe('Remediation — findings picker', () => {
  test('inline picker renders, scrolls, searches and toggles', async ({ page }) => {
    await page.goto('/remediation')
    await page.waitForLoadState('networkidle')

    // The task table. If the tenant has no remediation tasks, there is nothing
    // to open — skip rather than fail (data-dependent).
    const firstRow = page.getByRole('row').nth(1) // row 0 = header
    if (!(await firstRow.isVisible().catch(() => false))) {
      test.skip(true, 'no remediation tasks in this tenant to open a drawer for')
      return
    }

    // Open the task detail drawer.
    await firstRow.click()
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()
    // "Linked Findings (N)" is a styled <p>, not a semantic heading.
    await expect(drawer.getByText(/Linked Findings/i)).toBeVisible()

    // Enter the inline picker.
    await drawer.getByRole('button', { name: /Manage/i }).click()

    // The inline "Link findings" panel replaces the drawer body.
    const pickerHeading = drawer.getByRole('heading', { name: 'Link findings' })
    await expect(pickerHeading).toBeVisible()

    // The open-findings count subtitle ("N linked · M open findings").
    await expect(drawer.getByText(/open findings/i)).toBeVisible()

    // Search is server-side: typing narrows the list. We don't assert an exact
    // count (data-dependent) — only that typing holds the input value (the iPad
    // focus-loss bug this rework had to survive).
    const search = drawer.getByPlaceholder(/Search findings/i)
    await search.fill('a')
    await expect(search).toHaveValue('a')
    await search.fill('')

    // Wait for the findings list to finish loading before measuring scroll —
    // otherwise the skeleton hasn't overflowed yet and the check is racy.
    const findingRows = drawer.locator('button:has(> span[aria-hidden="true"])')
    await expect(findingRows.first()).toBeVisible({ timeout: 15_000 })
    await expect.poll(async () => findingRows.count(), { timeout: 15_000 }).toBeGreaterThan(10)

    // Scrollability: the Sheet's SheetContent (= the dialog element, which has
    // overflow-y-auto) is the scroll host. It must overflow when the tenant has
    // many findings, and scrolling it must move scrollTop — this is the exact
    // "can't scroll on iPad" bug the whole rework had to fix.
    const metrics = await search.evaluate((inputEl) => {
      // Climb to the nearest actually-scrollable ancestor (the Sheet's scroll host).
      let node: HTMLElement | null = inputEl as HTMLElement
      while (node) {
        const style = getComputedStyle(node)
        const scrollable = /(auto|scroll)/.test(style.overflowY)
        if (scrollable && node.scrollHeight > node.clientHeight + 1) break
        node = node.parentElement
      }
      if (!node) return { found: false, tag: '', scrollTop: 0 }
      node.scrollTop = 400
      return {
        found: true,
        tag: node.tagName + '.' + (node.className || '').split(' ')[0],
        scrollTop: node.scrollTop,
      }
    })
    expect(metrics.found, 'picker must have a scrollable host').toBeTruthy()
    expect(metrics.scrollTop, 'scrolling the host must move scrollTop').toBeGreaterThan(0)

    // Toggle a finding row and confirm its checkbox flips (Check icon appears).
    const firstFinding = findingRows.first()
    const wasChecked = (await firstFinding.locator('svg.lucide-check').count()) > 0
    await firstFinding.click()
    // The checkbox state must flip.
    await expect
      .poll(async () => (await firstFinding.locator('svg.lucide-check').count()) > 0)
      .toBe(!wasChecked)
    // Toggle back so the test leaves the task's links unchanged.
    await firstFinding.click()
    await expect
      .poll(async () => (await firstFinding.locator('svg.lucide-check').count()) > 0)
      .toBe(wasChecked)

    // Leave the picker → back to task details.
    await drawer.getByRole('button', { name: 'Done' }).click()
    await expect(drawer.getByText(/Linked Findings/i)).toBeVisible()
    await expect(pickerHeading).toBeHidden()
  })
})
