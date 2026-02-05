/**
 * Utility functions for building repository code links
 *
 * Supports: GitHub, GitLab, Bitbucket, Azure DevOps
 */

export interface RepositoryLinkParams {
  /** Repository web URL (e.g., https://github.com/owner/repo) */
  repositoryUrl?: string
  /** File path within the repository */
  filePath?: string
  /** Start line number */
  startLine?: number
  /** End line number (optional, for range highlighting) */
  endLine?: number
  /** Git branch name */
  branch?: string
  /** Git commit SHA */
  commitSha?: string
}

type RepositoryPlatform = 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'unknown'

/**
 * Detect repository platform from URL
 */
function detectPlatform(url: string): RepositoryPlatform {
  const hostname = new URL(url).hostname.toLowerCase()

  if (hostname.includes('github')) return 'github'
  if (hostname.includes('gitlab')) return 'gitlab'
  if (hostname.includes('bitbucket')) return 'bitbucket'
  if (hostname.includes('dev.azure.com') || hostname.includes('visualstudio.com')) return 'azure'

  return 'unknown'
}

/**
 * Build line anchor for different platforms
 */
function buildLineAnchor(
  platform: RepositoryPlatform,
  startLine?: number,
  endLine?: number
): string {
  if (!startLine) return ''

  switch (platform) {
    case 'github':
      // GitHub: #L10 or #L10-L20
      return endLine && endLine !== startLine ? `#L${startLine}-L${endLine}` : `#L${startLine}`

    case 'gitlab':
      // GitLab: #L10 or #L10-20
      return endLine && endLine !== startLine ? `#L${startLine}-${endLine}` : `#L${startLine}`

    case 'bitbucket':
      // Bitbucket: #lines-10 or #lines-10:20
      return endLine && endLine !== startLine
        ? `#lines-${startLine}:${endLine}`
        : `#lines-${startLine}`

    case 'azure':
      // Azure DevOps: &line=10 or &line=10&lineEnd=20
      return endLine && endLine !== startLine
        ? `&line=${startLine}&lineEnd=${endLine}`
        : `&line=${startLine}`

    default:
      return `#L${startLine}`
  }
}

/**
 * Build full repository code URL
 *
 * @example
 * ```ts
 * buildRepositoryCodeUrl({
 *   repositoryUrl: 'https://github.com/owner/repo',
 *   filePath: 'src/app.ts',
 *   startLine: 42,
 *   branch: 'main'
 * })
 * // Returns: https://github.com/owner/repo/blob/main/src/app.ts#L42
 * ```
 */
export function buildRepositoryCodeUrl(params: RepositoryLinkParams): string | null {
  const { repositoryUrl, filePath, startLine, endLine, branch, commitSha } = params

  // Need at least repository URL and file path
  if (!repositoryUrl || !filePath) return null

  try {
    const platform = detectPlatform(repositoryUrl)
    const ref = commitSha || branch || 'main'

    // Remove trailing slash from base URL
    const baseUrl = repositoryUrl.replace(/\/$/, '')

    // Build the URL based on platform
    let codeUrl: string

    switch (platform) {
      case 'github':
        // https://github.com/owner/repo/blob/main/path/to/file.ts#L42
        codeUrl = `${baseUrl}/blob/${ref}/${filePath}`
        break

      case 'gitlab':
        // https://gitlab.com/owner/repo/-/blob/main/path/to/file.ts#L42
        codeUrl = `${baseUrl}/-/blob/${ref}/${filePath}`
        break

      case 'bitbucket':
        // https://bitbucket.org/owner/repo/src/main/path/to/file.ts#lines-42
        codeUrl = `${baseUrl}/src/${ref}/${filePath}`
        break

      case 'azure':
        // https://dev.azure.com/org/project/_git/repo?path=/path/to/file.ts&version=GBmain&line=42
        const versionPrefix = commitSha ? 'GC' : 'GB' // GC for commit, GB for branch
        codeUrl = `${baseUrl}?path=/${filePath}&version=${versionPrefix}${ref}`
        break

      default:
        // Unknown platform - try GitHub-like format
        codeUrl = `${baseUrl}/blob/${ref}/${filePath}`
    }

    // Add line anchor
    const lineAnchor = buildLineAnchor(platform, startLine, endLine)
    if (lineAnchor) {
      codeUrl += lineAnchor
    }

    return codeUrl
  } catch {
    // Invalid URL or other error
    return null
  }
}

/**
 * Check if a URL looks like a valid repository URL
 */
export function isValidRepositoryUrl(url?: string): boolean {
  if (!url) return false

  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}
