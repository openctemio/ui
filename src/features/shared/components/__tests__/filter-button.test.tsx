import { describe, it, expect, vi } from 'vitest'
import { createRef } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FilterButton, FilterPanelToggle } from '../filter-button'

// Radix Popover/Tooltip measure their content; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('FilterButton', () => {
  it('is an icon-only button named "Filters" with no visible text', () => {
    render(<FilterButton />)
    const btn = screen.getByRole('button', { name: 'Filters' })
    expect(btn).toHaveTextContent('')
    expect(btn.querySelector('svg')).not.toBeNull()
    expect(btn).toHaveClass('size-9')
    expect(btn).not.toHaveAttribute('aria-pressed')
    expect(btn).not.toHaveAttribute('data-active')
  })

  it('shows the active count as a badge and in its accessible name', () => {
    render(<FilterButton activeCount={3} />)
    const btn = screen.getByRole('button', { name: 'Filters (3 active)' })
    expect(btn).toHaveAttribute('data-active')
    const badge = btn.querySelector('[data-slot="filter-count"]')
    expect(badge).toHaveTextContent('3')
    expect(badge).toHaveAttribute('aria-hidden', 'true')
  })

  it('caps the badge at 99+', () => {
    render(<FilterButton activeCount={150} />)
    expect(
      screen.getByRole('button').querySelector('[data-slot="filter-count"]')
    ).toHaveTextContent('99+')
  })

  it('reports aria-pressed when toggling a panel', () => {
    const { rerender } = render(<FilterButton panelOpen={false} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
    rerender(<FilterButton panelOpen />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('forwards its ref and works as a Popover trigger', async () => {
    const ref = createRef<HTMLButtonElement>()
    render(
      <Popover>
        <PopoverTrigger asChild>
          <FilterButton ref={ref} label="Filter by property" />
        </PopoverTrigger>
        <PopoverContent>property picker</PopoverContent>
      </Popover>
    )
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    expect(screen.queryByText('property picker')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Filter by property' }))
    expect(screen.getByText('property picker')).toBeInTheDocument()
    expect(ref.current).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows a tooltip on keyboard focus', async () => {
    render(<FilterButton />)
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveFocus()
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Filters')
  })
})

describe('FilterPanelToggle', () => {
  it('renders the panel toggle and the sheet trigger, wired to their handlers', () => {
    const onToggle = vi.fn()
    const onOpenSheet = vi.fn()
    render(
      <FilterPanelToggle
        open={false}
        onToggle={onToggle}
        onOpenSheet={onOpenSheet}
        activeCount={2}
        controlsId="x-filters"
      />
    )
    const [panel, sheet] = screen.getAllByRole('button', { name: 'Filters (2 active)' })
    expect(panel).toHaveAttribute('aria-controls', 'x-filters')
    expect(panel).toHaveAttribute('aria-pressed', 'false')
    expect(sheet).toHaveAttribute('aria-haspopup', 'dialog')
    fireEvent.click(panel)
    fireEvent.click(sheet)
    expect(onToggle).toHaveBeenCalledOnce()
    expect(onOpenSheet).toHaveBeenCalledOnce()
  })
})
