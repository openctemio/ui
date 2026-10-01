import { describe, it, expect } from 'vitest'
import type { ApiFinding } from '../../api/finding-api.types'
import { findingAssetType, findingAssetTypeLabel } from '../finding-asset-type'

const f = (source: string, asset?: ApiFinding['asset']) =>
  ({ source, asset }) as Pick<ApiFinding, 'source' | 'asset'>

describe('findingAssetType', () => {
  it('uses the inventory asset type the API sends', () => {
    expect(findingAssetType(f('dast', { id: 'a', name: 'https://x', type: 'website' }))).toBe(
      'website'
    )
    expect(findingAssetType(f('dast', { id: 'a', name: 'x.example', type: 'domain' }))).toBe(
      'domain'
    )
  })

  it('treats pentest-style findings as targets', () => {
    expect(findingAssetType(f('pentest', { id: 'a', name: 'x', type: 'website' }))).toBe('target')
  })

  it('falls back to repository when the response has no asset', () => {
    expect(findingAssetType(f('sast'))).toBe('repository')
  })
})

describe('findingAssetTypeLabel', () => {
  it('names the real asset type, not "Repository" for everything', () => {
    expect(findingAssetTypeLabel('domain')).toBe('Domain')
    expect(findingAssetTypeLabel('ip_address')).toBe('IP Address')
    expect(findingAssetTypeLabel('repository')).toBe('Repository')
  })

  it('labels pentest targets "Target"', () => {
    expect(findingAssetTypeLabel('target')).toBe('Target')
  })

  it('shows an unknown type as sent, and "Asset" when there is none', () => {
    expect(findingAssetTypeLabel('quantum_widget')).toBe('quantum_widget')
    expect(findingAssetTypeLabel(undefined)).toBe('Asset')
  })
})
