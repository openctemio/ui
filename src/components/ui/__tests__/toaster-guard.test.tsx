import { describe, expect, it, vi } from 'vitest'
import { isInToaster, ignoreToasterInteractions } from '@/components/ui/toaster-guard'

describe('toaster guard', () => {
  it('recognises elements inside the toaster', () => {
    const ol = document.createElement('ol')
    ol.setAttribute('data-sonner-toaster', '')
    const btn = document.createElement('button')
    ol.appendChild(btn)
    expect(isInToaster(btn)).toBe(true)
    expect(isInToaster(document.body)).toBe(false)
    expect(isInToaster(null)).toBe(false)
  })

  it('prevents the default only for toaster targets and keeps the caller handler otherwise', () => {
    const handler = vi.fn()
    const guarded = ignoreToasterInteractions(handler)
    const ol = document.createElement('ol')
    ol.setAttribute('data-sonner-toaster', '')
    const inside = { target: ol, preventDefault: vi.fn() }
    guarded(inside)
    expect(inside.preventDefault).toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
    const outside = { target: document.body, preventDefault: vi.fn() }
    guarded(outside)
    expect(outside.preventDefault).not.toHaveBeenCalled()
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
