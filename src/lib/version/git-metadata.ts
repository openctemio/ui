/**
 * Reads a git checkout's HEAD and release tags straight from the filesystem.
 *
 * Server-only (node:fs). The dev deployment runs `next dev` on a bind-mounted
 * checkout with no git binary in the container, so this resolves what `git
 * rev-parse HEAD` and `git tag` would say by reading `.git` itself: loose and
 * packed refs, a detached HEAD, and a linked worktree's `.git` file
 * (`gitdir:` + `commondir`).
 *
 * The same reader exists in the API (openctemio/api pkg/version/gitinfo.go).
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'

export interface GitMetadata {
  /** Full SHA HEAD points at; undefined when it cannot be resolved. */
  head?: string
  /**
   * Highest vX.Y.Z tag in the repository. Not "the tag HEAD descends from":
   * release tags live on release branches, so on develop the highest tag is
   * the honest base for "<tag>-dev".
   */
  latestTag?: string
}

const FULL_SHA = /^[0-9a-f]{40}([0-9a-f]{24})?$/i
const SEMVER_TAG = /^v(\d+)\.(\d+)\.(\d+)$/
const MAX_PARENT_WALK = 8
const MAX_SYMREF_DEPTH = 5

async function readText(file: string): Promise<string | undefined> {
  try {
    return (await fs.readFile(file, 'utf8')).trim()
  } catch {
    return undefined
  }
}

async function isDir(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isDirectory()
  } catch {
    return false
  }
}

/** Walks up from dir to the first `.git` (a directory, or a `gitdir:` file). */
async function findGitDir(dir: string): Promise<string | undefined> {
  let d = path.resolve(dir)
  for (let i = 0; i < MAX_PARENT_WALK; i++) {
    const p = path.join(d, '.git')
    let stat
    try {
      stat = await fs.stat(p)
    } catch {
      stat = undefined
    }
    if (stat) {
      if (stat.isDirectory()) return p
      const line = await readText(p)
      const m = line?.match(/^gitdir:\s*(.+)$/)
      if (!m) return undefined
      const target = path.resolve(d, m[1].trim())
      return (await isDir(target)) ? target : undefined
    }
    const parent = path.dirname(d)
    if (parent === d) break
    d = parent
  }
  return undefined
}

/** ref name -> SHA from packed-refs ("^" peeled lines skipped). */
async function readPackedRefs(commonDir: string): Promise<Map<string, string>> {
  const refs = new Map<string, string>()
  const text = await readText(path.join(commonDir, 'packed-refs'))
  if (!text) return refs
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#') || line.startsWith('^')) continue
    const space = line.indexOf(' ')
    if (space < 0) continue
    const sha = line.slice(0, space)
    if (FULL_SHA.test(sha)) refs.set(line.slice(space + 1).trim(), sha)
  }
  return refs
}

/** Keeps a ref read from HEAD inside the git directory. */
function validRefName(ref: string): boolean {
  return ref.startsWith('refs/') && !ref.includes('..') && !ref.includes('\0')
}

async function resolveHead(
  gitDir: string,
  commonDir: string,
  packed: Map<string, string>
): Promise<string | undefined> {
  let content = await readText(path.join(gitDir, 'HEAD'))
  for (let i = 0; content !== undefined && i < MAX_SYMREF_DEPTH; i++) {
    const m = content.match(/^ref:\s*(.+)$/)
    if (!m) return FULL_SHA.test(content) ? content.toLowerCase() : undefined
    const ref = m[1].trim()
    if (!validRefName(ref)) return undefined
    const loose = await readText(path.join(commonDir, ...ref.split('/')))
    if (loose !== undefined) {
      content = loose
      continue
    }
    return packed.get(ref)?.toLowerCase() // undefined: unborn branch
  }
  return undefined
}

function compareSemver(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i]
  return 0
}

async function latestTag(
  commonDir: string,
  packed: Map<string, string>
): Promise<string | undefined> {
  const names = new Set<string>()
  for (const ref of packed.keys()) {
    if (ref.startsWith('refs/tags/')) names.add(ref.slice('refs/tags/'.length))
  }
  try {
    for (const e of await fs.readdir(path.join(commonDir, 'refs', 'tags'), {
      withFileTypes: true,
    })) {
      if (e.isFile()) names.add(e.name)
    }
  } catch {
    // no loose tags
  }

  let best: string | undefined
  let bestKey: number[] = [-1, -1, -1]
  for (const name of names) {
    const m = name.match(SEMVER_TAG)
    if (!m) continue
    const key = [Number(m[1]), Number(m[2]), Number(m[3])]
    if (compareSemver(key, bestKey) > 0) {
      best = name
      bestKey = key
    }
  }
  return best
}

/**
 * HEAD and the highest release tag of the checkout containing dir, or null
 * when there is no checkout. Never throws.
 */
export async function readGitMetadata(dir: string): Promise<GitMetadata | null> {
  try {
    const gitDir = await findGitDir(dir)
    if (!gitDir) return null
    let commonDir = gitDir
    const common = await readText(path.join(gitDir, 'commondir'))
    if (common) commonDir = path.resolve(gitDir, common)

    const packed = await readPackedRefs(commonDir)
    const [head, tag] = await Promise.all([
      resolveHead(gitDir, commonDir, packed),
      latestTag(commonDir, packed),
    ])
    return { head, latestTag: tag }
  } catch {
    return null
  }
}
