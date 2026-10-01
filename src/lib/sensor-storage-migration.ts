/**
 * One-time browser-storage migration for the agent -> sensor rename
 * (RFC-023 §9.5; openctemio/api docs/rfcs/RFC-023-sensor-rename-contract.md §11).
 *
 * Installations ran under the "agent" vocabulary for a long time, so browsers
 * hold state written before the rename. It is migrated on the first load of
 * the new UI, before anything reads it:
 *
 * 1. Cached permissions (localStorage `openctem_perms:<tenantId>`): the
 *    permission ids `agents:*` become `sensors:*`. The API renamed them in
 *    place (migration 000230); without this, a member's sidebar would hide
 *    Sensors until the cache was refreshed from the server.
 * 2. Any app key (localStorage or sessionStorage, prefix `openctem`) whose
 *    name says agent, e.g. `openctem:agents-filters-open` ->
 *    `openctem:sensors-filters-open`: the value is copied to the new key
 *    unless the new key already exists (newer state wins), then the old key
 *    is removed.
 *
 * Idempotent (a migrated value no longer matches; a removed key is gone),
 * safe to run on every load, and never throws: storage can be unavailable
 * (private mode, blocked site data) or hold anything.
 */

/** Cached-permission keys (see src/lib/permission-storage.ts). */
const PERMISSION_CACHE_PREFIX = 'openctem_perms'
/** Only our own keys are renamed; third-party keys are left alone. */
const APP_KEY_PREFIX = 'openctem'
/**
 * "agent" / "agents" as a word inside a key name: kebab, snake, dotted or
 * camelCase (agents-filters, agent_table, sensorAgentTab), never inside
 * another word ("reagent").
 */
const AGENT_TOKEN = /(?:(?<![A-Za-z])[Aa]gent|(?<=[a-z])Agent|(?<![A-Za-z])AGENT)(?:s|S)?(?![a-z])/g
/** The HTTP User-Agent is not a sensor. */
const USER_AGENT = /user[-_.]?agent/i
const OLD_PERMISSION_PREFIX = 'agents:'
const NEW_PERMISSION_PREFIX = 'sensors:'

export interface SensorStorageMigrationReport {
  /** Keys whose value was rewritten in place. */
  rewritten: string[]
  /** Old key -> new key. */
  renamed: Array<[string, string]>
}

/** The post-rename name of a storage key (unchanged when it does not say agent). */
export function migratedStorageKey(key: string): string {
  if (USER_AGENT.test(key)) return key
  return key.replace(AGENT_TOKEN, (word: string) => {
    const base = word.slice(0, 5)
    const sensor = base === 'AGENT' ? 'SENSOR' : base[0] === 'A' ? 'Sensor' : 'sensor'
    return sensor + word.slice(5)
  })
}

function keysOf(storage: Storage): string[] {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key !== null) keys.push(key)
  }
  return keys
}

function migratePermissionCache(
  storage: Storage,
  key: string,
  report: SensorStorageMigrationReport
) {
  const raw = storage.getItem(key)
  if (!raw) return
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return
  }
  if (!data || typeof data !== 'object') return
  const permissions = (data as { permissions?: unknown }).permissions
  if (!Array.isArray(permissions)) return
  let changed = false
  const next = permissions.map((p) => {
    if (typeof p === 'string' && p.startsWith(OLD_PERMISSION_PREFIX)) {
      changed = true
      return NEW_PERMISSION_PREFIX + p.slice(OLD_PERMISSION_PREFIX.length)
    }
    return p
  })
  if (!changed) return
  storage.setItem(key, JSON.stringify({ ...(data as object), permissions: [...new Set(next)] }))
  report.rewritten.push(key)
}

function migrateStorage(storage: Storage, report: SensorStorageMigrationReport) {
  for (const key of keysOf(storage)) {
    try {
      if (key.startsWith(PERMISSION_CACHE_PREFIX)) migratePermissionCache(storage, key, report)

      if (!key.startsWith(APP_KEY_PREFIX)) continue
      const next = migratedStorageKey(key)
      if (next === key) continue
      const value = storage.getItem(key)
      if (value !== null && storage.getItem(next) === null) storage.setItem(next, value)
      storage.removeItem(key)
      report.renamed.push([key, next])
    } catch {
      // One bad entry (quota, a value that changed underneath us) must not
      // stop the rest of the migration or the page.
    }
  }
}

function storageOrNull(get: () => Storage): Storage | null {
  try {
    return get()
  } catch {
    // SecurityError when site data is blocked.
    return null
  }
}

/**
 * Migrate the given storages (default: this window's localStorage and
 * sessionStorage). Returns what changed; never throws.
 */
export function migrateSensorBrowserStorage(storages?: Array<Storage | null>) {
  const report: SensorStorageMigrationReport = { rewritten: [], renamed: [] }
  const targets =
    storages ??
    (typeof window === 'undefined'
      ? []
      : [storageOrNull(() => window.localStorage), storageOrNull(() => window.sessionStorage)])
  for (const storage of targets) {
    if (!storage) continue
    try {
      migrateStorage(storage, report)
    } catch {
      // Storage became unavailable mid-way; nothing else to do.
    }
  }
  return report
}
