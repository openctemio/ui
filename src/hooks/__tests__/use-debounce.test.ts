import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '../use-debounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================
  // Initial value
  // ============================================
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500))
    expect(result.current).toBe('hello')
  })

  // ============================================
  // Debounce behavior
  // ============================================
  it('does not update the value before the delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    })

    rerender({ value: 'updated', delay: 500 })

    // Before delay, still returns old value
    act(() => {
      vi.advanceTimersByTime(499)
    })

    expect(result.current).toBe('initial')
  })

  it('updates the value after the delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    })

    rerender({ value: 'updated', delay: 500 })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe('updated')
  })

  it('resets the timer when value changes rapidly', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'a', delay: 300 },
    })

    // Type rapidly: a -> b -> c
    rerender({ value: 'b', delay: 300 })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    rerender({ value: 'c', delay: 300 })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Only 200ms since last change, should still be 'a'
    expect(result.current).toBe('a')

    // Wait for 300ms from last change
    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Now it should be the latest value 'c', skipping 'b'
    expect(result.current).toBe('c')
  })

  // ============================================
  // Cleanup on unmount
  // ============================================
  it('cancels pending updates on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    rerender({ value: 'updated', delay: 500 })

    // Unmount before the timeout fires
    unmount()

    // Advance timers past the delay
    act(() => {
      vi.advanceTimersByTime(600)
    })

    // The last captured value should still be 'initial'
    // (hook unmounted, so result.current is frozen at last render)
    expect(result.current).toBe('initial')
  })

  // ============================================
  // Different types
  // ============================================
  it('works with number values', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 0, delay: 200 },
    })

    rerender({ value: 42, delay: 200 })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current).toBe(42)
  })

  it('works with object values', () => {
    const initial = { search: '' }
    const updated = { search: 'test' }

    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: initial, delay: 200 },
    })

    rerender({ value: updated, delay: 200 })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current).toEqual({ search: 'test' })
  })

  // ============================================
  // Delay changes
  // ============================================
  it('respects delay changes', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'a', delay: 500 },
    })

    // Change both value and delay
    rerender({ value: 'b', delay: 100 })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current).toBe('b')
  })
})
