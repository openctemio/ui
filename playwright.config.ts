import { defineConfig, devices } from '@playwright/test'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

/**
 * Playwright configuration for OpenCTEM UI end-to-end tests.
 *
 * Tests live in `e2e/` and exercise the running stack (UI + API + DB).
 * They are intentionally separated from the Vitest unit suite under `src/`.
 *
 * Usage:
 *   1. Start the API and UI locally (or against a staging environment).
 *   2. Copy `e2e/.env.example` to `e2e/.env` and fill in credentials.
 *   3. Run `npm run e2e` (or `npm run e2e:ui` for the test runner UI).
 *
 * The default base URL is `http://localhost:3000`. Override with the
 * `E2E_BASE_URL` environment variable to target a different instance.
 */

// Tiny .env loader (avoids adding `dotenv` as a direct dependency).
// Lines like KEY=VALUE; ignores blanks and # comments. Quotes stripped.
function loadEnvFile(file: string): void {
  if (!existsSync(file)) return
  const content = readFileSync(file, 'utf8')
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

loadEnvFile(path.resolve(__dirname, 'e2e/.env'))

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  // Timeouts — generous because real auth + DB writes can be slow on first run.
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // Opt-in parallelism. Tests in different files run in parallel; tests in the
  // same file run sequentially. Set workers=1 in CI to avoid contention on a
  // shared backend.
  fullyParallel: true,
  workers: isCI ? 1 : undefined,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,

  reporter: isCI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Locale matches the default UI locale; flip via E2E_LOCALE if needed.
    locale: process.env.E2E_LOCALE ?? 'en-US',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add firefox / webkit projects when cross-browser coverage is needed.
  ],
})
