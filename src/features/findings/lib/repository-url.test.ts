import { describe, expect, it } from 'vitest'

import { buildRepositoryCodeUrl, isValidRepositoryUrl, normalizeRepoWebUrl } from './repository-url'

describe('normalizeRepoWebUrl', () => {
  it('converts scp-style SSH to https and strips .git', () => {
    expect(normalizeRepoWebUrl('git@github.com:owner/repo.git')).toBe(
      'https://github.com/owner/repo'
    )
  })

  it('converts ssh:// url-style to https', () => {
    expect(normalizeRepoWebUrl('ssh://git@gitlab.com/group/sub/repo.git')).toBe(
      'https://gitlab.com/group/sub/repo'
    )
  })

  it('strips trailing .git and slash from https clone URLs', () => {
    expect(normalizeRepoWebUrl('https://github.com/owner/repo.git')).toBe(
      'https://github.com/owner/repo'
    )
    expect(normalizeRepoWebUrl('https://github.com/owner/repo/')).toBe(
      'https://github.com/owner/repo'
    )
  })

  it('leaves a clean web URL unchanged', () => {
    expect(normalizeRepoWebUrl('https://github.com/owner/repo')).toBe(
      'https://github.com/owner/repo'
    )
  })
})

describe('buildRepositoryCodeUrl', () => {
  it('builds a GitHub blob URL with a line anchor', () => {
    expect(
      buildRepositoryCodeUrl({
        repositoryUrl: 'https://github.com/owner/repo',
        filePath: 'src/app.ts',
        startLine: 42,
        branch: 'main',
      })
    ).toBe('https://github.com/owner/repo/blob/main/src/app.ts#L42')
  })

  it('works from an SSH clone URL (previously returned null)', () => {
    expect(
      buildRepositoryCodeUrl({
        repositoryUrl: 'git@github.com:owner/repo.git',
        filePath: 'src/app.ts',
        startLine: 10,
        endLine: 20,
        branch: 'dev',
      })
    ).toBe('https://github.com/owner/repo/blob/dev/src/app.ts#L10-L20')
  })

  it('does not leave a .git in the path for https clone URLs', () => {
    const url = buildRepositoryCodeUrl({
      repositoryUrl: 'https://github.com/owner/repo.git',
      filePath: 'a.ts',
      startLine: 1,
    })
    expect(url).toBe('https://github.com/owner/repo/blob/main/a.ts#L1')
    expect(url).not.toContain('.git')
  })

  it('uses GitLab /-/blob/ path and supports subgroups', () => {
    expect(
      buildRepositoryCodeUrl({
        repositoryUrl: 'https://gitlab.com/group/sub/repo',
        filePath: 'lib/x.go',
        startLine: 5,
        branch: 'main',
      })
    ).toBe('https://gitlab.com/group/sub/repo/-/blob/main/lib/x.go#L5')
  })

  it('returns null without repo url or file path', () => {
    expect(buildRepositoryCodeUrl({ filePath: 'a.ts' })).toBeNull()
    expect(buildRepositoryCodeUrl({ repositoryUrl: 'https://github.com/o/r' })).toBeNull()
  })
})

describe('isValidRepositoryUrl', () => {
  it('accepts https and SSH clone URLs', () => {
    expect(isValidRepositoryUrl('https://github.com/o/r')).toBe(true)
    expect(isValidRepositoryUrl('git@github.com:o/r.git')).toBe(true)
  })

  it('rejects empty and non-repo strings', () => {
    expect(isValidRepositoryUrl()).toBe(false)
    expect(isValidRepositoryUrl('not a url')).toBe(false)
  })
})
