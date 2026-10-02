/**
 * No `loading.tsx` inside the dashboard shell.
 *
 * Every dashboard page is a client component that renders its own skeleton
 * while its data loads, so a route-level loading file adds nothing but a second
 * skeleton, and it costs time: Next mounts a new Suspense boundary for the
 * loading file on each navigation into another section, React shows its
 * fallback, and then holds the real page back for at least 300 ms (React's
 * fallback throttle). Measured on a production build (ui perf/navigation):
 * /findings 1156 -> 177 ms and /attack-surface 398 -> 71 ms to content once the
 * loading files were removed. Click feedback comes from NavPendingHint instead.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const DASHBOARD = join(process.cwd(), 'src', 'app', '(dashboard)')

function loadingFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return entry === '__tests__' ? [] : loadingFiles(full)
    return /^loading\.(tsx|ts|jsx|js)$/.test(entry) ? [relative(process.cwd(), full)] : []
  })
}

describe('dashboard routes', () => {
  it('have no route-level loading file (pages render their own skeletons)', () => {
    expect(loadingFiles(DASHBOARD)).toEqual([])
  })
})
