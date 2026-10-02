/**
 * The UI's release version and commit, baked in at build time.
 *
 * Release images get them from the tag (docker-publish.yml passes
 * NEXT_PUBLIC_APP_VERSION and NEXT_PUBLIC_APP_COMMIT as build args). Other
 * builds (dev server, local builds) have neither, and say so, rather than
 * showing package.json's "version", which is not bumped on release.
 *
 * The reads are literal `process.env.NEXT_PUBLIC_*` so Next inlines them into
 * the client bundle.
 */
export interface AppVersion {
  /** e.g. "v0.9.0"; undefined outside a release build. */
  version?: string
  /** Short commit SHA; undefined when the build did not record it. */
  commit?: string
}

export function getAppVersion(): AppVersion {
  const version = process.env.NEXT_PUBLIC_APP_VERSION?.trim() || undefined
  const commit = process.env.NEXT_PUBLIC_APP_COMMIT?.trim().slice(0, 7) || undefined
  return { version, commit }
}
