/**
 * Asset Name Normalization (client-side preview)
 *
 * Mirrors the server-side normalization in pkg/domain/asset/normalize.go.
 * Used to show users a preview of how their input will be stored.
 * The API always re-normalizes authoritatively before storage.
 *
 * RFC-001: Asset Identity Resolution & Deduplication
 */

export function normalizeAssetName(name: string, assetType: string): string {
  name = name.trim().replace(/\0/g, '')
  if (!name) return ''

  switch (assetType) {
    case 'domain':
    case 'subdomain':
      return normalizeDNS(name)

    case 'ip_address':
      return name.trim() // IPv4/v6 canonical done server-side (net.ParseIP)

    case 'host':
      // If it looks like an IP, leave as-is (server handles canonical)
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(name)) return name
      return normalizeDNS(name)

    case 'repository':
    case 'code_repo':
      return normalizeRepo(name)

    case 'application':
    case 'website':
    case 'web_application':
    case 'api':
      return normalizeURL(name)

    case 'certificate':
      return name.toLowerCase().replace(/\.+$/, '')

    case 'database':
    case 'data_store':
      return normalizeDatabase(name)

    case 'network':
    case 'subnet':
    case 'container':
    case 'kubernetes':
    case 'kubernetes_cluster':
    case 'kubernetes_namespace':
    case 'cloud_account':
    case 'vpc':
    case 'mobile_app':
      return name.toLowerCase()

    case 'storage':
    case 's3_bucket':
      return normalizeStorage(name)

    case 'identity':
    case 'iam_user':
    case 'iam_role':
    case 'service_account':
      return name.trim() // Keep case for ARN

    default:
      return name
  }
}

function normalizeDNS(name: string): string {
  // Strip protocol
  name = name.replace(/^https?:\/\//, '')
  // Strip port
  const portMatch = name.match(/^([^:]+):\d+$/)
  if (portMatch) name = portMatch[1]
  // Strip path
  const slashIdx = name.indexOf('/')
  if (slashIdx > 0) name = name.slice(0, slashIdx)
  // Lowercase, trim dots
  return name.toLowerCase().replace(/^\.+|\.+$/g, '')
}

function normalizeRepo(name: string): string {
  name = name.toLowerCase()
  name = name.replace(/^https?:\/\//, '')
  if (name.startsWith('git@')) {
    name = name.slice(4)
    const colonIdx = name.indexOf(':')
    if (colonIdx > 0) name = name.slice(0, colonIdx) + '/' + name.slice(colonIdx + 1)
  }
  name = name.replace(/\.git$/, '')
  name = name.replace(/\/_git\//, '/')
  // Strip branch references
  for (const ref of ['/tree/', '/blob/', '/commit/', '/branches/']) {
    const idx = name.indexOf(ref)
    if (idx > 0) name = name.slice(0, idx)
  }
  return name.replace(/\/+$/, '')
}

function normalizeURL(name: string): string {
  try {
    const hasScheme = name.includes('://')
    const parseInput = hasScheme ? name : `https://${name}`
    const url = new URL(parseInput)
    let host = url.hostname.toLowerCase()
    const scheme = url.protocol.replace(':', '').toLowerCase()

    // Strip default ports
    if ((scheme === 'https' && url.port === '443') || (scheme === 'http' && url.port === '80')) {
      // default port, don't include
    } else if (url.port) {
      host += `:${url.port}`
    }

    const path = url.pathname.replace(/\/+$/, '')

    if (hasScheme) return `${scheme}://${host}${path}`
    return `${host}${path}`
  } catch {
    return name.toLowerCase().trim()
  }
}

function normalizeDatabase(name: string): string {
  // Strip protocol
  name = name.replace(/^(postgres|postgresql|mysql|mongodb(\+srv)?|rediss?):\/\//, '')
  // Strip credentials
  const atIdx = name.indexOf('@')
  if (atIdx > 0) name = name.slice(atIdx + 1)
  // Strip query
  const qIdx = name.indexOf('?')
  if (qIdx > 0) name = name.slice(0, qIdx)
  return name.toLowerCase()
}

function normalizeStorage(name: string): string {
  name = name.replace(/^s3:\/\//i, '')
  // Extract from virtual-hosted URL
  const s3Match = name.match(/^(.+)\.s3\..*\.amazonaws\.com$/)
  if (s3Match) return s3Match[1].toLowerCase()
  const s3Match2 = name.match(/^(.+)\.s3\.amazonaws\.com$/)
  if (s3Match2) return s3Match2[1].toLowerCase()
  // Path-style
  if (name.startsWith('s3.') && name.includes('/')) {
    const parts = name.split('/')
    if (parts.length >= 2 && parts[1]) return parts[1].toLowerCase()
  }
  return name.toLowerCase().replace(/\/+$/, '')
}
