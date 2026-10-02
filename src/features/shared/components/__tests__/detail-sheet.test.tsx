import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Server } from 'lucide-react'
import {
  DetailSheetHeader,
  DetailSections,
  DetailSection,
  DetailField,
  DetailFieldGrid,
  DetailStatGrid,
  DetailStat,
  DetailCallout,
} from '../detail-sheet'

describe('DetailSheetHeader', () => {
  it('renders title, subtitle, status, badges and actions', () => {
    render(
      <DetailSheetHeader
        icon={Server}
        title="api.example.com"
        subtitle="Production"
        status={<span>Active</span>}
        badges={<span>Critical</span>}
        actions={<button>Copy</button>}
      />
    )
    expect(screen.getByRole('heading', { level: 2, name: 'api.example.com' })).toBeInTheDocument()
    expect(screen.getByText('Production')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })

  it('draws the icon in a neutral tile — no per-type colour', () => {
    const { container } = render(<DetailSheetHeader icon={Server} title="x" />)
    const tile = container.querySelector('[data-slot="detail-sheet-icon"]')
    expect(tile).toHaveClass('bg-muted', 'text-muted-foreground')
    expect(tile?.className).not.toMatch(/bg-primary|from-|gradient/)
  })

  it('lets a long title wrap instead of overflowing', () => {
    render(<DetailSheetHeader title="a-very-long-hostname.internal.example.com" />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveClass('break-words')
  })

  it('omits the icon tile and optional rows when not given', () => {
    const { container } = render(<DetailSheetHeader title="x" />)
    expect(container.querySelector('[data-slot="detail-sheet-icon"]')).toBeNull()
    expect(container.querySelectorAll('.flex-wrap')).toHaveLength(0)
  })
})

describe('DetailSection', () => {
  it('renders a heading with count and actions, then its content', () => {
    render(
      <DetailSection title="Tags" icon={Server} count={3} actions={<button>Edit tags</button>}>
        <p>body</p>
      </DetailSection>
    )
    const heading = screen.getByRole('heading', { level: 3 })
    expect(heading).toHaveTextContent('Tags')
    expect(heading).toHaveTextContent('3')
    expect(screen.getByRole('button', { name: 'Edit tags' })).toBeInTheDocument()
    expect(screen.getByText('body')).toBeInTheDocument()
  })

  it('is not a bordered card', () => {
    const { container } = render(<DetailSection title="Timeline">x</DetailSection>)
    const section = container.querySelector('section')!
    expect(section.className).not.toMatch(/\bborder\b|rounded|bg-card/)
  })

  it('renders a zero count', () => {
    render(<DetailSection title="Findings" count={0} />)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('0')
  })
})

describe('DetailSection landmark', () => {
  it('is a region named by its heading', () => {
    render(<DetailSection title="Scanner content">x</DetailSection>)
    expect(screen.getByRole('region', { name: 'Scanner content' })).toBeInTheDocument()
  })
})

describe('DetailStatGrid / DetailStat', () => {
  it('renders label, tabular value, unit, caption and a meter', () => {
    render(
      <DetailStatGrid aria-label="Numbers">
        <DetailStat
          label="Jobs running"
          value={2}
          unit="/ 5"
          caption="3 slots free"
          meter={{ value: 2, max: 5, label: 'Slots in use' }}
        />
      </DetailStatGrid>
    )
    expect(screen.getByText('Jobs running').tagName).toBe('DT')
    expect(screen.getByText('2')).toHaveClass('tabular-nums')
    expect(screen.getByText('/ 5')).toBeInTheDocument()
    expect(screen.getByText('3 slots free')).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Slots in use' })).toHaveAttribute(
      'aria-valuenow',
      '2'
    )
  })

  it('is two per row on phones and one row of N from sm', () => {
    const { container } = render(
      <DetailStatGrid>
        <DetailStat label="A" value={1} />
        <DetailStat label="B" value={2} />
        <DetailStat label="C" value={3} />
        {null}
      </DetailStatGrid>
    )
    const grid = container.firstChild as HTMLElement
    expect(grid).toHaveClass('grid-cols-2')
    expect(grid.style.getPropertyValue('--detail-stat-cols')).toBe('3')
  })

  it('renders nothing without stats', () => {
    const { container } = render(<DetailStatGrid>{null}</DetailStatGrid>)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('DetailCallout', () => {
  it('is a named region with a tone, the problem, the explanation and actions', () => {
    render(
      <DetailCallout
        label="Health"
        tone="warning"
        icon={Server}
        title="Templates: refresh failed"
        actions={<button>Refresh</button>}
      >
        Scans keep using the installed version.
      </DetailCallout>
    )
    const region = screen.getByRole('region', { name: 'Health' })
    expect(region).toHaveAttribute('data-tone', 'warning')
    expect(region.className).toMatch(/bg-warning\/10/)
    expect(screen.getByText('Templates: refresh failed')).toBeInTheDocument()
    expect(screen.getByText('Scans keep using the installed version.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })
})

describe('DetailSections', () => {
  it('separates sections with a divider', () => {
    const { container } = render(
      <DetailSections>
        <DetailSection title="A" />
        <DetailSection title="B" />
      </DetailSections>
    )
    expect(container.firstChild).toHaveClass('[&>*+*]:border-t')
  })
})

describe('DetailField / DetailFieldGrid', () => {
  it('renders label/value pairs as a description list', () => {
    render(
      <DetailFieldGrid>
        <DetailField label="Owner reference">team-a</DetailField>
      </DetailFieldGrid>
    )
    const label = screen.getByText('Owner reference')
    expect(label.tagName).toBe('DT')
    expect(label).toHaveClass('text-xs', 'text-muted-foreground')
    expect(screen.getByText('team-a').tagName).toBe('DD')
  })

  it('is one column on phones and two from sm', () => {
    const { container } = render(<DetailFieldGrid />)
    expect(container.firstChild).toHaveClass('grid-cols-1', 'sm:grid-cols-2')
  })

  it('skips empty values', () => {
    render(
      <DetailFieldGrid>
        <DetailField label="Empty">{''}</DetailField>
        <DetailField label="Missing">{undefined}</DetailField>
        <DetailField label="Zero">{0}</DetailField>
      </DetailFieldGrid>
    )
    expect(screen.queryByText('Empty')).toBeNull()
    expect(screen.queryByText('Missing')).toBeNull()
    expect(screen.getByText('Zero')).toBeInTheDocument()
  })

  it('spans both columns when full', () => {
    render(
      <DetailField label="Description" full>
        text
      </DetailField>
    )
    expect(screen.getByText('Description').parentElement).toHaveClass('sm:col-span-2')
  })
})
