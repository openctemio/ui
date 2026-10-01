import { test, expect } from '../fixtures/authenticated-page'

/**
 * Scan detail: run counts and who triggered a run.
 *
 * Regressions this guards:
 *   1. "Total Runs 0" while the run history showed a run in progress (the
 *      scan's counters only move when a run finishes).
 *   2. The Trigger column showed the triggering user's raw id.
 *
 * Needs a scan with a run that has not finished (trigger one with a sensor
 * online); skipped otherwise.
 */

type Run = { status: string; triggered_by?: string; triggered_by_name?: string }
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

test('a scan with a run in progress counts it and names who triggered it', async ({ page }) => {
  test.setTimeout(180_000)
  const list = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/v1/scans' && r.ok(),
    { timeout: 60_000 }
  )
  await page.goto('/scans')
  const body = (await (await list).json()) as {
    data?: Array<{ id: string }>
    items?: Array<{ id: string }>
  }
  const scans = body.data ?? body.items ?? []

  for (const scan of scans.slice(0, 10)) {
    const runsRes = page.waitForResponse(
      (r) => r.url().includes(`/api/v1/scans/${scan.id}/runs`) && r.ok(),
      { timeout: 60_000 }
    )
    await page.goto(`/scans/${scan.id}`)
    const runs = ((await (await runsRes).json()) as { data?: Run[] }).data ?? []
    const active = runs.filter((r) => ['pending', 'queued', 'running'].includes(r.status))
    if (active.length === 0) continue

    // The stat card counts the in-progress runs.
    const card = page.getByText('Total Runs', { exact: false }).locator('xpath=..')
    await expect(card).toContainText(`${active.length} in progress`)
    const total = Number((await card.locator('p').first().innerText()).trim())
    expect(total).toBeGreaterThanOrEqual(active.length)

    // No raw user id in the run history; a named trigger shows the name.
    const history = page.getByRole('table')
    await expect(history).toBeVisible()
    await expect(history).not.toContainText(UUID)
    const named = runs.find((r) => r.triggered_by_name)
    if (named) await expect(history).toContainText(named.triggered_by_name!)
    return
  }
  test.skip(true, 'No scan with a run in progress')
})
