import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Server } from 'lucide-react'
import {
  DetailSheetHeader,
  DetailSections,
  DetailSection,
  DetailField,
  DetailFieldGrid,
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
