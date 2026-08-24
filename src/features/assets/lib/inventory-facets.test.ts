import { describe, it, expect } from 'vitest'
import { deactivatePreset, QUICK_PRESETS } from './inventory-facets'
import type { InventoryFilters } from './inventory-url'

const preset = (id: string) => {
  const p = QUICK_PRESETS.find((x) => x.id === id)
  if (!p) throw new Error(`preset ${id} not found`)
  return p
}

describe('deactivatePreset', () => {
  it('removes only the preset-contributed values, preserving manual criticalities', () => {
    const p = preset('critical-with-findings') // apply: { criticalities: ['critical'], hasFindings: true }
    const filters: InventoryFilters = {
      criticalities: ['critical', 'high', 'medium'],
      hasFindings: true,
      types: ['host'],
      page: 3,
    }

    const next = deactivatePreset(filters, p)

    // 'critical' (the preset's own value) is gone; user-added values remain.
    expect(next.criticalities).toEqual(['high', 'medium'])
    // The preset's scalar contribution is removed.
    expect(next.hasFindings).toBeUndefined()
    // Unrelated filters are untouched.
    expect(next.types).toEqual(['host'])
    expect(next.page).toBe(3)
  })

  it('drops the array key entirely when only the preset value was selected', () => {
    const p = preset('critical-with-findings')
    const filters: InventoryFilters = { criticalities: ['critical'], hasFindings: true }

    const next = deactivatePreset(filters, p)

    expect(next.criticalities).toBeUndefined()
    expect('criticalities' in next).toBe(false)
    expect(next.hasFindings).toBeUndefined()
  })

  it('removes a scalar-only preset without touching other filters', () => {
    const p = preset('crown-jewels') // apply: { isCrownJewel: true }
    const filters: InventoryFilters = {
      isCrownJewel: true,
      criticalities: ['critical', 'high'],
    }

    const next = deactivatePreset(filters, p)

    expect(next.isCrownJewel).toBeUndefined()
    // Manual criticalities are preserved since this preset doesn't own them.
    expect(next.criticalities).toEqual(['critical', 'high'])
  })

  it('does not mutate the input filters object', () => {
    const p = preset('critical-with-findings')
    const filters: InventoryFilters = { criticalities: ['critical', 'high'], hasFindings: true }
    const snapshot = JSON.parse(JSON.stringify(filters))

    deactivatePreset(filters, p)

    expect(filters).toEqual(snapshot)
  })

  it('re-applying then deactivating a preset restores manual selections', () => {
    const p = preset('critical-with-findings')
    // User manually selected 'high' first.
    const manual: InventoryFilters = { criticalities: ['high'] }

    // Preset ON is a shallow merge (mirrors the component's on-path).
    const on: InventoryFilters = { ...manual, ...p.apply }
    expect(on.criticalities).toEqual(['critical']) // apply replaces the array on
    on.criticalities = ['high', 'critical'] // simulate the user's combined selection
    on.hasFindings = true

    const off = deactivatePreset(on, p)
    expect(off.criticalities).toEqual(['high'])
    expect(off.hasFindings).toBeUndefined()
  })
})
