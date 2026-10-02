'use client'

import useSWR from 'swr'

import { get } from '@/lib/api/client'
import { adminFetch } from '@/features/admin-console/api/admin-client'
import {
  channelOf,
  getAppVersion,
  parseBuildInfo,
  shortCommit,
  type BuildInfo,
} from '@/lib/app-version'
import type { ShortcutShell } from '@/config/keyboard-shortcuts'

/** Where the shell's API version comes from: its own session decides. */
export const API_VERSION_PATH = '/api/v1/version'
export const ADMIN_API_VERSION_PATH = '/version' // under /api/v1/admin
export const WEB_VERSION_PATH = '/api/version'

export interface BuildVersions {
  /** undefined while loading; null when it could not be determined. */
  web: BuildInfo | null | undefined
  api: BuildInfo | null | undefined
}

/** The web build baked into a release bundle, when the route is unreachable. */
function bakedWebBuild(): BuildInfo | null {
  const { version, commit } = getAppVersion()
  return version ? { version, commit: shortCommit(commit), channel: channelOf(version) } : null
}

async function fetchWebBuild(): Promise<BuildInfo | null> {
  try {
    const res = await fetch(WEB_VERSION_PATH, { credentials: 'same-origin', cache: 'no-store' })
    if (res.ok) {
      const info = parseBuildInfo(await res.json())
      if (info) return info
    }
  } catch {
    // fall through
  }
  return bakedWebBuild()
}

async function fetchApiBuild(shell: ShortcutShell): Promise<BuildInfo | null> {
  try {
    const data =
      shell === 'admin'
        ? await adminFetch<unknown>(ADMIN_API_VERSION_PATH)
        : await get<unknown>(API_VERSION_PATH)
    return parseBuildInfo(data)
  } catch {
    return null
  }
}

const swrOptions = {
  revalidateOnFocus: false,
  shouldRetryOnError: false,
  dedupingInterval: 30_000,
}

/**
 * The web app's and the API's build, fetched while `enabled` (the About dialog
 * is open). Failures resolve to null, never throw: About must always render.
 */
export function useBuildVersions(shell: ShortcutShell, enabled: boolean): BuildVersions {
  const web = useSWR(enabled ? ['build-version', 'web'] : null, fetchWebBuild, swrOptions)
  const api = useSWR(
    enabled ? ['build-version', 'api', shell] : null,
    () => fetchApiBuild(shell),
    swrOptions
  )
  return { web: web.data, api: api.data }
}
