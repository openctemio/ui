import { memo } from 'react'
import { describe, it, expect } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { SidebarProvider, useSidebar, useSidebarActions } from './sidebar'

// Nav rows only need the sidebar's setters. They must not re-render when the
// sidebar opens or collapses: every row re-rendering on each toggle is what made
// the collapse animation stutter.
describe('SidebarProvider actions context', () => {
  it('does not re-render action-only consumers when the sidebar toggles', () => {
    let renders = 0
    let toggle: () => void = () => {}
    const ActionsOnly = memo(function ActionsOnly() {
      renders++
      toggle = useSidebarActions().toggleSidebar
      return null
    })
    function State() {
      return <span data-testid="state">{useSidebar().state}</span>
    }

    render(
      <SidebarProvider>
        <ActionsOnly />
        <State />
      </SidebarProvider>
    )
    expect(screen.getByTestId('state').textContent).toBe('expanded')
    const rendersBefore = renders

    act(() => toggle())
    expect(screen.getByTestId('state').textContent).toBe('collapsed')
    act(() => toggle())
    expect(screen.getByTestId('state').textContent).toBe('expanded')

    expect(renders).toBe(rendersBefore)
  })

  it('keeps functional setOpen updates correct with a stable setter', () => {
    let setOpen: (v: boolean | ((o: boolean) => boolean)) => void = () => {}
    function Grab() {
      setOpen = useSidebarActions().setOpen as typeof setOpen
      return <span data-testid="state">{useSidebar().state}</span>
    }
    render(
      <SidebarProvider defaultOpen={false}>
        <Grab />
      </SidebarProvider>
    )
    act(() => setOpen((o) => !o))
    expect(screen.getByTestId('state').textContent).toBe('expanded')
    act(() => {
      setOpen((o) => !o)
      setOpen((o) => !o)
    })
    expect(screen.getByTestId('state').textContent).toBe('expanded')
  })
})
