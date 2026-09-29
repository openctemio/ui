import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MetricStrip } from '../metric-strip'

describe('MetricStrip', () => {
  it('renders each label and a locale-formatted value', () => {
    render(
      <MetricStrip
        items={[
          { key: 'total', label: 'All findings', value: 12773 },
          { key: 'ratio', label: 'SLA', value: '98%' },
        ]}
      />
    )
    expect(screen.getByText('All findings')).toBeInTheDocument()
    expect(screen.getByText((12773).toLocaleString())).toBeInTheDocument()
    expect(screen.getByText('98%')).toBeInTheDocument()
  })

  it('colours a danger metric only while it is positive — a zero stays neutral', () => {
    render(
      <MetricStrip
        items={[
          { key: 'a', label: 'Overdue', value: 3, tone: 'danger' },
          { key: 'b', label: 'In KEV', value: 0, tone: 'danger' },
        ]}
      />
    )
    expect(screen.getByText('3')).toHaveClass('text-destructive')
    expect(screen.getByText('0')).not.toHaveClass('text-destructive')
  })

  it('makes clickable metrics toggle buttons that report their pressed state', () => {
    const onClick = vi.fn()
    render(
      <MetricStrip
        items={[
          { key: 'crit', label: 'Critical', value: 22, onClick, active: true },
          { key: 'total', label: 'Total', value: 93 },
        ]}
      />
    )
    const btn = screen.getByRole('button', { name: /critical/i })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledTimes(1)
    // Non-clickable metrics are not buttons.
    expect(screen.queryByRole('button', { name: /total/i })).not.toBeInTheDocument()
  })

  it('shows skeletons instead of values while loading', () => {
    render(<MetricStrip loading items={[{ key: 't', label: 'Total', value: 93 }]} />)
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.queryByText('93')).not.toBeInTheDocument()
  })
})
