import { describe, expect, it } from 'vitest'
import { CHANGE_VIEWS, changeUrl, isChangeView } from '../api/use-asset-changes'

const from = '2026-09-23T00:00:00.000Z'

describe('changeUrl', () => {
  it('maps every view to its state-history endpoint', () => {
    const paths = CHANGE_VIEWS.map(
      (v) => changeUrl(v, { from, internetOnly: false }, 20, 0).split('?')[0]
    )
    expect(paths).toEqual([
      '/api/v1/state-history/appearances',
      '/api/v1/state-history/disappearances',
      '/api/v1/state-history/newly-exposed',
      '/api/v1/state-history/exposure-changes',
      '/api/v1/state-history/shadow-it',
    ])
  })

  it('sends the period, page and internet-facing filter', () => {
    const url = new URL(changeUrl('appeared', { from, internetOnly: true }, 50, 100), 'http://x')
    expect(url.searchParams.get('from')).toBe(from)
    expect(url.searchParams.get('limit')).toBe('50')
    expect(url.searchParams.get('offset')).toBe('100')
    expect(url.searchParams.get('internet_facing')).toBe('true')
  })

  it('omits offset on the first page and the filter when off', () => {
    const url = new URL(changeUrl('shadow_it', { from, internetOnly: false }, 20, 0), 'http://x')
    expect(url.searchParams.has('offset')).toBe(false)
    expect(url.searchParams.has('internet_facing')).toBe(false)
  })
})

describe('isChangeView', () => {
  it('accepts the five views and rejects anything else from the URL', () => {
    expect(CHANGE_VIEWS.every(isChangeView)).toBe(true)
    expect(isChangeView('recovered')).toBe(false)
    expect(isChangeView('')).toBe(false)
  })
})
