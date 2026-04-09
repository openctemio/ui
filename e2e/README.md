# OpenCTEM UI — End-to-End Tests

This directory contains [Playwright](https://playwright.dev/) end-to-end
tests that exercise the running stack (UI + API + database) through real
browser interactions. They are intentionally kept separate from the
Vitest unit suite under `src/`.

## Why a separate suite?

The unit tests under `src/` mock the API and run against a virtual DOM
(`jsdom`). They are fast but cannot catch:

- Route protection regressions (cookies, redirects, middleware)
- Auth + multi-tenant context handoff
- API + UI contract mismatches (a backend rename that breaks the
  frontend would compile and unit-test fine but blow up in the browser)
- Real navigation flows that depend on cookies, SWR cache, and form
  state at the same time

These E2E tests address those gaps with a small, high-signal set of
tests that cover the platform's most user-visible flows.

## The five critical flows

| #   | Spec file                                   | What it covers                                             |
| --- | ------------------------------------------- | ---------------------------------------------------------- |
| 1   | `01-login-and-invitation.spec.ts`           | Login form rejection, successful login, invitation preview |
| 2   | `02-asset-relationship-multiselect.spec.ts` | Asset list, relationships tab, multi-select picker         |
| 3   | `03-tag-crud.spec.ts`                       | Add and remove tags from an asset                          |
| 4   | `04-findings-asset-filter.spec.ts`          | `?assetId=` filter on /findings page                       |
| 5   | `05-owner-picker.spec.ts`                   | Asset owner picker open + search                           |

Each spec is designed to:

- **Skip gracefully** when prerequisites are missing (no env, no seed
  data) so the suite stays green on a fresh clone.
- **Avoid hard-coded copy** in favour of role/label selectors so the
  tests survive UI tweaks and i18n.
- **Document its TODOs** — every spec ends with a comment block listing
  the deeper assertions that should be added once the relevant
  data-testid hooks or API helpers exist.

## Setup

1. Install Playwright browsers (first time only):

   ```bash
   npm run e2e:install
   ```

2. Copy the env template and fill in real credentials:

   ```bash
   cp e2e/.env.example e2e/.env
   $EDITOR e2e/.env
   ```

   You need at minimum:
   - `E2E_USER_EMAIL` — seed admin/owner user
   - `E2E_USER_PASSWORD` — that user's password
   - `E2E_TENANT_SLUG` — slug of the tenant they belong to

   Optional:
   - `E2E_BASE_URL` — defaults to `http://localhost:3000`
   - `E2E_API_BASE_URL` — for tests that hit the API directly
   - `E2E_LOCALE` — override the browser locale (defaults to `en-US`)

3. Make sure the UI and API are running:

   ```bash
   # in api/
   make dev

   # in ui/
   npm run dev
   ```

## Running

```bash
npm run e2e               # headless run, all specs
npm run e2e:headed        # show the browser as it runs
npm run e2e:ui            # interactive Playwright UI runner
npm run e2e:report        # open the most recent HTML report
```

By default the suite uses Chromium only. To add Firefox / WebKit,
uncomment the relevant `projects:` entries in `playwright.config.ts`.

## Layout

```
e2e/
├── README.md                       # this file
├── .env.example                    # copy to .env and fill in
├── fixtures/
│   └── authenticated-page.ts       # custom test fixture (logged-in page)
├── helpers/
│   ├── auth.ts                     # loginAs(), gotoDashboardPath()
│   └── env.ts                      # env loading + skip-on-missing
└── specs/
    ├── 01-login-and-invitation.spec.ts
    ├── 02-asset-relationship-multiselect.spec.ts
    ├── 03-tag-crud.spec.ts
    ├── 04-findings-asset-filter.spec.ts
    └── 05-owner-picker.spec.ts
```

## Writing new tests

Use the authenticated fixture for any test that needs a logged-in
session:

```ts
import { test, expect } from '../fixtures/authenticated-page'

test('my new flow', async ({ page, e2eConfig }) => {
  await page.goto('/some-page')
  // ...
})
```

For tests that exercise unauthenticated flows (login, register, public
invitation preview) import `test` from `@playwright/test` directly.

### Selector guidelines

- **Prefer roles and accessible names** (`getByRole`, `getByLabel`).
- **Avoid CSS class selectors** — they break on Tailwind/CVA refactors.
- **Use `data-testid`** when there is no semantic alternative, and add
  the attribute on the source component in the same PR.
- **Use regular expressions** for any user-facing text so the test
  survives small copy changes and basic localisation.

### Skipping gracefully

When a test depends on seed data that may not be present, use:

```ts
if (!(await something.isVisible().catch(() => false))) {
  test.skip(true, 'Need at least one X — seed it to enable this test')
  return
}
```

This keeps the suite useful as a smoke test on a fresh tenant while
giving teams with seed data the full coverage.

## Troubleshooting

- **All tests skip with "missing env vars"** — copy `e2e/.env.example`
  to `e2e/.env`.
- **Login times out** — check that the API is actually running on the
  port your `E2E_BASE_URL` points to and that the seed user can log in
  manually in a real browser.
- **"No assets in tenant"** — most tests need at least one asset; seed
  one via the API or the UI before running.
- **Tests pass locally, fail in CI** — bump `workers: 1` in
  `playwright.config.ts` (already the default for `CI=true`) and check
  for tests that depend on shared state.

## CI integration

When wiring this into CI, the recommended invocation is:

```bash
CI=true \
E2E_BASE_URL=http://ui:3000 \
E2E_API_BASE_URL=http://api:8080 \
E2E_USER_EMAIL=$E2E_SEED_USER \
E2E_USER_PASSWORD=$E2E_SEED_PASSWORD \
E2E_TENANT_SLUG=$E2E_SEED_TENANT \
npm run e2e
```

The `CI=true` env enables retries, single-worker mode, and the GitHub
reporter. Upload `playwright-report/` and `test-results/` as artifacts
so failures can be inspected with screenshots and traces.
