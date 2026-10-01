/**
 * Target mappings: which asset types a scanner can scan, keyed by the target
 * types it declares in `supported_targets`. Smart filtering uses the active
 * mappings at scan time to skip assets the scanner cannot handle.
 *
 * The two value lists mirror the API's validation exactly:
 * - target types: `ValidTargetTypes` in api `pkg/domain/tool/target_mapping.go`
 * - asset types: `AllAssetTypes()` in api `pkg/domain/asset/value_objects.go`
 * A value missing here cannot be chosen in the console; a value here that the
 * API does not accept is rejected by the API with a 400.
 */

/** Priority of a primary mapping (`is_primary` is derived from it). */
export const PRIMARY_PRIORITY = 10
/** Priority the API gives a new mapping when none is set. */
export const DEFAULT_PRIORITY = 100
/** Bounds the API enforces on `priority`. */
export const MIN_PRIORITY = 1
export const MAX_PRIORITY = 1000
/** The API's limit on `description`. */
export const MAX_DESCRIPTION_LENGTH = 500

export interface TargetTypeOption {
  value: string
  label: string
  hint: string
}

export const TARGET_TYPE_OPTIONS: TargetTypeOption[] = [
  { value: 'url', label: 'URL', hint: 'Web addresses: websites, web applications, APIs' },
  { value: 'domain', label: 'Domain', hint: 'Domain names and subdomains' },
  { value: 'ip', label: 'IP', hint: 'IP addresses' },
  { value: 'host', label: 'Host', hint: 'Hosts and servers' },
  { value: 'repository', label: 'Repository', hint: 'Source code repositories' },
  { value: 'file', label: 'File', hint: 'Files and build artifacts' },
  { value: 'container', label: 'Container', hint: 'Container images' },
  { value: 'kubernetes', label: 'Kubernetes', hint: 'Kubernetes clusters' },
  { value: 'cloud_account', label: 'Cloud account', hint: 'AWS, GCP and Azure accounts' },
  { value: 'compute', label: 'Compute', hint: 'Virtual machines and instances' },
  { value: 'storage', label: 'Storage', hint: 'Object storage: S3, Blob, GCS' },
  { value: 'serverless', label: 'Serverless', hint: 'Lambda, Cloud Functions' },
  { value: 'network', label: 'Network', hint: 'Networks and network devices' },
  { value: 'service', label: 'Service', hint: 'Network services' },
  { value: 'port', label: 'Port', hint: 'Open ports' },
  { value: 'database', label: 'Database', hint: 'Database servers' },
  { value: 'mobile', label: 'Mobile', hint: 'Mobile applications' },
  { value: 'api', label: 'API', hint: 'API endpoints' },
  { value: 'certificate', label: 'Certificate', hint: 'TLS certificates' },
]

export const MAPPABLE_ASSET_TYPES: string[] = [
  'domain',
  'subdomain',
  'certificate',
  'ip_address',
  'website',
  'web_application',
  'api',
  'mobile_app',
  'service',
  'repository',
  'cloud_account',
  'compute',
  'storage',
  'serverless',
  'container_registry',
  'host',
  'container',
  'kubernetes_cluster',
  'kubernetes_namespace',
  'endpoint',
  'database',
  'data_store',
  's3_bucket',
  'network',
  'vpc',
  'subnet',
  'load_balancer',
  'firewall',
  'iam_user',
  'iam_role',
  'service_account',
  'unclassified',
  'http_service',
  'open_port',
  'discovered_url',
  'application',
  'identity',
  'kubernetes',
]

export function targetTypeLabel(value: string): string {
  return TARGET_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function targetTypeHint(value: string): string | undefined {
  return TARGET_TYPE_OPTIONS.find((o) => o.value === value)?.hint
}

export interface TargetMappingFormValues {
  priority: string
  description: string
}

/**
 * Client-side copy of the API's rules, so the dialog can say what is wrong
 * before a round trip. The API stays the authority.
 */
export function validateTargetMappingForm(v: TargetMappingFormValues): {
  priority?: string
  description?: string
} {
  const errors: { priority?: string; description?: string } = {}
  const trimmed = v.priority.trim()
  const n = Number(trimmed)
  if (trimmed === '' || !Number.isInteger(n)) {
    errors.priority = 'Enter a whole number'
  } else if (n < MIN_PRIORITY || n > MAX_PRIORITY) {
    errors.priority = `Between ${MIN_PRIORITY} and ${MAX_PRIORITY}`
  }
  if (v.description.trim().length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `At most ${MAX_DESCRIPTION_LENGTH} characters`
  }
  return errors
}
