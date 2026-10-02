/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { readGitMetadata } from '../git-metadata'
import {
  resetWebBuildInfoCache,
  resolveWebBuildInfo,
  WEB_BUILD_INFO_TTL_MS,
} from '../web-build-info'

const SHA_A = '4d2f4b02aa11bb22cc33dd44ee55ff6677889900'
const SHA_B = '0123456789abcdef0123456789abcdef01234567'

let root: string

function write(rel: string, content: string) {
  const p = path.join(root, rel)
  mkdirSync(path.dirname(p), { recursive: true })
  writeFileSync(p, content)
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'git-meta-'))
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('readGitMetadata', () => {
  it('resolves a branch through a loose ref and finds the highest tag across loose and packed tags', async () => {
    write('.git/HEAD', 'ref: refs/heads/develop\n')
    write('.git/refs/heads/develop', `${SHA_A}\n`)
    write('.git/refs/tags/v0.2.1', `${SHA_B}\n`)
    write(
      '.git/packed-refs',
      [
        '# pack-refs with: peeled fully-peeled sorted',
        `${SHA_B} refs/tags/v0.10.0`,
        `^${SHA_A}`,
        `${SHA_B} refs/tags/v0.9.0`,
        `${SHA_B} refs/tags/v0.11.0-rc1`,
        `${SHA_B} refs/tags/latest`,
        `${SHA_B} refs/remotes/origin/develop`,
        '',
      ].join('\n')
    )
    mkdirSync(path.join(root, 'src', 'app'), { recursive: true })

    // Started from a subdirectory: .git is found by walking up.
    await expect(readGitMetadata(path.join(root, 'src', 'app'))).resolves.toEqual({
      head: SHA_A,
      latestTag: 'v0.10.0', // numeric, not lexical, ordering; pre-releases ignored
    })
  })

  it('resolves a branch that only exists in packed-refs', async () => {
    write('.git/HEAD', 'ref: refs/heads/develop\n')
    write('.git/packed-refs', `${SHA_A} refs/heads/develop\n`)
    await expect(readGitMetadata(root)).resolves.toEqual({ head: SHA_A, latestTag: undefined })
  })

  it('reads a detached HEAD', async () => {
    write('.git/HEAD', `${SHA_B.toUpperCase()}\n`)
    await expect(readGitMetadata(root)).resolves.toEqual({ head: SHA_B, latestTag: undefined })
  })

  it('follows a worktree .git file (gitdir + commondir)', async () => {
    write('main/.git/worktrees/feature/HEAD', 'ref: refs/heads/feature\n')
    write('main/.git/worktrees/feature/commondir', '../..\n')
    write('main/.git/refs/heads/feature', `${SHA_B}\n`)
    write('main/.git/packed-refs', `${SHA_A} refs/tags/v0.8.0\n`)
    write('wt/.git', `gitdir: ${path.join(root, 'main/.git/worktrees/feature')}\n`)

    await expect(readGitMetadata(path.join(root, 'wt'))).resolves.toEqual({
      head: SHA_B,
      latestTag: 'v0.8.0',
    })
  })

  it('resolves a relative gitdir', async () => {
    write('real/HEAD', `${SHA_A}\n`)
    write('wt/.git', 'gitdir: ../real\n')
    await expect(readGitMetadata(path.join(root, 'wt'))).resolves.toMatchObject({ head: SHA_A })
  })

  it('returns null when there is no checkout', async () => {
    await expect(readGitMetadata(root)).resolves.toBeNull()
  })

  it('leaves HEAD unresolved for an unborn branch or a ref outside refs/', async () => {
    write('.git/HEAD', 'ref: refs/heads/main\n')
    await expect(readGitMetadata(root)).resolves.toEqual({ head: undefined, latestTag: undefined })

    write('.git/HEAD', 'ref: refs/../../secret\n')
    write('secret', `${SHA_A}\n`)
    await expect(readGitMetadata(root)).resolves.toMatchObject({ head: undefined })
  })
})

describe('resolveWebBuildInfo', () => {
  beforeEach(() => resetWebBuildInfoCache())
  afterEach(() => vi.unstubAllEnvs())

  it('reports a release image from its baked-in version', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_VERSION', 'v0.9.0')
    vi.stubEnv('NEXT_PUBLIC_APP_COMMIT', SHA_A)
    await expect(resolveWebBuildInfo(root)).resolves.toEqual({
      version: 'v0.9.0',
      commit: '4d2f4b02',
      channel: 'release',
    })
  })

  it('reports "<highest tag>-dev" and HEAD from the checkout otherwise', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_VERSION', '')
    write('.git/HEAD', 'ref: refs/heads/develop\n')
    write('.git/refs/heads/develop', `${SHA_A}\n`)
    write('.git/packed-refs', `${SHA_B} refs/tags/v0.8.0\n`)
    await expect(resolveWebBuildInfo(root)).resolves.toEqual({
      version: 'v0.8.0-dev',
      commit: '4d2f4b02',
      channel: 'development',
    })
  })

  it('reports dev/unknown without a checkout', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_VERSION', '')
    await expect(resolveWebBuildInfo(root)).resolves.toEqual({
      version: 'dev',
      commit: 'unknown',
      channel: 'development',
    })
  })

  it('caches briefly, then picks up a git pull without a restart', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_VERSION', '')
    write('.git/HEAD', 'ref: refs/heads/develop\n')
    write('.git/refs/heads/develop', `${SHA_A}\n`)
    const t0 = 1_000_000
    expect((await resolveWebBuildInfo(root, t0)).commit).toBe('4d2f4b02')

    write('.git/refs/heads/develop', `${SHA_B}\n`) // the pull
    expect((await resolveWebBuildInfo(root, t0 + 1_000)).commit).toBe('4d2f4b02')
    expect((await resolveWebBuildInfo(root, t0 + WEB_BUILD_INFO_TTL_MS)).commit).toBe('01234567')
  })
})
