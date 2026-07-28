import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import { useUrlFilter, useUrlFilterList, useUrlFilterNumber, useUrlParams } from './use-url-param'

function setUrl(search: string) {
  window.history.replaceState(null, '', `/findings${search}`)
}

describe('URL-backed filters', () => {
  beforeEach(() => setUrl(''))

  it('reads a value from the query string', () => {
    setUrl('?severity=critical')
    const { result } = renderHook(() => useUrlFilter('severity', 'all'))
    expect(result.current[0]).toBe('critical')
  })

  it('falls back when the parameter is absent', () => {
    const { result } = renderHook(() => useUrlFilter('severity', 'all'))
    expect(result.current[0]).toBe('all')
  })

  // The point of the whole exercise: after clicking a filter, the address bar
  // holds a link that reproduces the view.
  it('writes the value to the query string', () => {
    const { result } = renderHook(() => useUrlFilter('severity', 'all'))
    act(() => result.current[1]('critical'))
    expect(window.location.search).toBe('?severity=critical')
    expect(result.current[0]).toBe('critical')
  })

  // A default view should link as /findings, not /findings?severity=all&status=all&...
  it('omits the parameter when it equals the fallback', () => {
    setUrl('?severity=critical')
    const { result } = renderHook(() => useUrlFilter('severity', 'all'))
    act(() => result.current[1]('all'))
    expect(window.location.search).toBe('')
  })

  it('leaves unrelated parameters alone', () => {
    setUrl('?assetId=abc&severity=high')
    const { result } = renderHook(() => useUrlFilter('severity', 'all'))
    act(() => result.current[1]('low'))
    const params = new URLSearchParams(window.location.search)
    expect(params.get('assetId')).toBe('abc')
    expect(params.get('severity')).toBe('low')
  })

  // history.replaceState does not fire popstate, so without the custom event
  // the component that wrote the value would never re-render.
  it('notifies other subscribers when the URL is rewritten', () => {
    const { result: params } = renderHook(() => useUrlParams())
    const { result: filter } = renderHook(() => useUrlFilter('status', 'all'))

    act(() => filter.current[1]('new'))

    expect(params.current.get('status')).toBe('new')
  })

  describe('list filters', () => {
    it('parses a comma-separated list', () => {
      setUrl('?sources=sast,secret')
      const { result } = renderHook(() => useUrlFilterList('sources'))
      expect(result.current[0]).toEqual(['sast', 'secret'])
    })

    it('is empty when absent', () => {
      const { result } = renderHook(() => useUrlFilterList('sources'))
      expect(result.current[0]).toEqual([])
    })

    it('serialises comma-separated, matching what the API accepts', () => {
      const { result } = renderHook(() => useUrlFilterList('sources'))
      act(() => result.current[1](['sast', 'secret', 'iac']))
      expect(new URLSearchParams(window.location.search).get('sources')).toBe('sast,secret,iac')
    })

    it('drops the parameter when the selection is cleared', () => {
      setUrl('?sources=sast')
      const { result } = renderHook(() => useUrlFilterList('sources'))
      act(() => result.current[1]([]))
      expect(window.location.search).toBe('')
    })

    it('ignores blank entries from a stray trailing comma', () => {
      setUrl('?sources=sast,,secret,')
      const { result } = renderHook(() => useUrlFilterList('sources'))
      expect(result.current[0]).toEqual(['sast', 'secret'])
    })
  })

  describe('number filters', () => {
    it('reads a page number', () => {
      setUrl('?page=3')
      const { result } = renderHook(() => useUrlFilterNumber('page', 1))
      expect(result.current[0]).toBe(3)
    })

    // A hand-edited or truncated link must not put the table into a broken state.
    it('falls back on a non-numeric or non-positive value', () => {
      for (const bad of ['abc', '0', '-2', '']) {
        setUrl(`?page=${bad}`)
        const { result } = renderHook(() => useUrlFilterNumber('page', 1))
        expect(result.current[0]).toBe(1)
      }
    })

    it('omits page 1', () => {
      setUrl('?page=4')
      const { result } = renderHook(() => useUrlFilterNumber('page', 1))
      act(() => result.current[1](1))
      expect(window.location.search).toBe('')
    })
  })
})

// Regressions found by adversarially testing the original implementation.
describe('URL filter regressions', () => {
  beforeEach(() => window.history.replaceState(null, '', '/findings'))

  // A deep link to a specific piece of evidence is often the reason a URL gets
  // shared at all. Rebuilding the URL from pathname + query dropped it.
  it('preserves the hash fragment when a filter changes', () => {
    window.history.replaceState(null, '', '/findings#evidence-3')
    const { result } = renderHook(() => useUrlFilter('severity', 'all'))
    act(() => result.current[1]('critical'))
    expect(window.location.hash).toBe('#evidence-3')
    expect(window.location.search).toBe('?severity=critical')
  })

  it('preserves the hash when the last filter is cleared', () => {
    window.history.replaceState(null, '', '/findings?severity=critical#evidence-3')
    const { result } = renderHook(() => useUrlFilter('severity', 'all'))
    act(() => result.current[1]('all'))
    expect(window.location.hash).toBe('#evidence-3')
    expect(window.location.search).toBe('')
  })

  // Two toggles in one tick, both resolved against the render-scope snapshot,
  // used to lose the first selection.
  it('composes two list updates in the same tick', () => {
    const { result } = renderHook(() => useUrlFilterList('sources'))
    act(() => {
      result.current[1]((prev) => [...prev, 'sast'])
      result.current[1]((prev) => [...prev, 'secret'])
    })
    expect(result.current[0]).toEqual(['sast', 'secret'])
  })

  it('still accepts a plain array', () => {
    const { result } = renderHook(() => useUrlFilterList('sources'))
    act(() => result.current[1](['iac']))
    expect(result.current[0]).toEqual(['iac'])
  })

  // Number() accepts '2.5', '1e9' and '0x10'. A page number of 2.5 reaches the
  // API as garbage.
  it('rejects non-integer page numbers', () => {
    for (const bad of ['2.5', '0x10', '1e9', 'Infinity']) {
      window.history.replaceState(null, '', `/findings?page=${bad}`)
      const { result } = renderHook(() => useUrlFilterNumber('page', 1))
      expect(result.current[0]).toBe(1)
    }
  })

  it('still accepts a real page number', () => {
    window.history.replaceState(null, '', '/findings?page=7')
    const { result } = renderHook(() => useUrlFilterNumber('page', 1))
    expect(result.current[0]).toBe(7)
  })
})
