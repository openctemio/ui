import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FacetPanel, FacetSection, FacetOption, FacetToggle } from '../facet-filter-panel'

describe('FacetPanel', () => {
  it('disables Clear all when nothing is filtered, and clears when something is', () => {
    const onClearAll = vi.fn()
    const { rerender } = render(
      <FacetPanel activeCount={0} onClearAll={onClearAll}>
        <div />
      </FacetPanel>
    )
    expect(screen.getByRole('button', { name: /clear all/i })).toBeDisabled()
    rerender(
      <FacetPanel activeCount={2} onClearAll={onClearAll}>
        <div />
      </FacetPanel>
    )
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    expect(onClearAll).toHaveBeenCalledTimes(1)
  })
})

describe('FacetSection', () => {
  it('toggles open and closed', () => {
    render(
      <FacetSection title="Severity">
        <span>content</span>
      </FacetSection>
    )
    const header = screen.getByRole('button', { name: /severity/i })
    expect(header).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens a folded-by-default section that is filtering, and shows how many options are on', () => {
    render(
      <FacetSection title="Source" defaultOpen={false} selectedCount={2}>
        <span>content</span>
      </FacetSection>
    )
    expect(screen.getByRole('button', { name: /source/i })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('keeps a folded section without selections closed', () => {
    render(
      <FacetSection title="SLA" defaultOpen={false}>
        <span>content</span>
      </FacetSection>
    )
    expect(screen.getByRole('button', { name: /sla/i })).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('FacetOption / FacetToggle', () => {
  it('checks an option by clicking its label', () => {
    const onChange = vi.fn()
    render(<FacetOption label="Critical" checked={false} onCheckedChange={onChange} />)
    fireEvent.click(screen.getByText('Critical'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('flips a toggle', () => {
    const onChange = vi.fn()
    render(<FacetToggle label="Assigned to me" checked={false} onCheckedChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
