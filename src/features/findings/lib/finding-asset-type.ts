import type { ApiFinding } from '../api/finding-api.types'
import type { AssetType } from '../types/finding.types'

/** Sources whose findings name free-text targets rather than an inventory asset. */
const TARGET_SOURCES = new Set(['pentest', 'bug_bounty', 'red_team', 'manual'])

/**
 * The type shown for a finding's affected asset. The API sends the inventory
 * asset with its type (`asset.type`); the findings list used to label every
 * asset "Repository", so a website, host or IP finding read as code.
 * Pentest-style findings point at targets; a finding without an asset in the
 * response falls back to "repository" (code findings, the historical default).
 */
export function findingAssetType(api: Pick<ApiFinding, 'source' | 'asset'>): AssetType {
  if (TARGET_SOURCES.has(api.source)) return 'target'
  return (api.asset?.type as AssetType | undefined) || 'repository'
}
