/**
 * The web app's own build identity, resolved on the server.
 *
 * A release image carries NEXT_PUBLIC_APP_VERSION / NEXT_PUBLIC_APP_COMMIT.
 * Anything else (the live `next dev` deployment above all) reads the checkout
 * it runs from: "<highest vX.Y.Z tag>-dev" and HEAD. The result is cached
 * briefly, so a `git pull` shows up within a minute without a restart.
 */
import {
  DEV_VERSION,
  UNKNOWN_COMMIT,
  channelOf,
  getAppVersion,
  shortCommit,
  type BuildInfo,
} from '@/lib/app-version'
import { readGitMetadata } from './git-metadata'

export const WEB_BUILD_INFO_TTL_MS = 60_000

let cached: { at: number; dir: string; info: BuildInfo } | undefined

export async function resolveWebBuildInfo(
  dir: string = process.cwd(),
  now: number = Date.now()
): Promise<BuildInfo> {
  const { version, commit } = getAppVersion()
  if (version) {
    return { version, commit: shortCommit(commit), channel: channelOf(version) }
  }

  if (cached && cached.dir === dir && now - cached.at < WEB_BUILD_INFO_TTL_MS) {
    return cached.info
  }
  const git = await readGitMetadata(dir)
  const info: BuildInfo = {
    version: git?.latestTag ? `${git.latestTag}-dev` : DEV_VERSION,
    commit: git?.head ? shortCommit(git.head) : UNKNOWN_COMMIT,
    channel: 'development',
  }
  cached = { at: now, dir, info }
  return info
}

/** Test hook: forget the cached value. */
export function resetWebBuildInfoCache(): void {
  cached = undefined
}
