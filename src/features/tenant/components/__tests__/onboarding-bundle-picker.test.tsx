import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingBundlePicker } from '../onboarding-bundle-picker'
import type { ModulePreset } from '@/features/organization/api/use-tenant-modules'

const BUNDLES: ModulePreset[] = [
  {
    id: 'asm',
    name: 'Attack Surface Management',
    description: 'External recon',
    target_persona: 'ASM team',
    icon: 'Globe',
    key_outcomes: ['Track external assets'],
    recommended_for: [],
    module_count: 20,
  },
  {
    id: 'vm',
    name: 'Vulnerability Management Essentials',
    description: 'Prioritise and fix',
    target_persona: 'VM team',
    icon: 'ShieldAlert',
    key_outcomes: ['Risk-based prioritisation'],
    recommended_for: [],
    module_count: 12,
  },
]

describe('OnboardingBundlePicker', () => {
  it('renders every bundle from the catalog', () => {
    render(<OnboardingBundlePicker bundles={BUNDLES} selected={new Set()} onToggle={vi.fn()} />)
    expect(screen.getByText('Attack Surface Management')).toBeInTheDocument()
    expect(screen.getByText('Vulnerability Management Essentials')).toBeInTheDocument()
    // Default state: nothing selected = full platform.
    expect(screen.getByText('Full platform — every module available')).toBeInTheDocument()
  })

  it('toggles a bundle on click', async () => {
    const onToggle = vi.fn()
    render(<OnboardingBundlePicker bundles={BUNDLES} selected={new Set()} onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('button', { name: /attack surface management/i }))
    expect(onToggle).toHaveBeenCalledWith('asm')
  })

  it('marks selected bundles with aria-pressed and shows the count', () => {
    render(
      <OnboardingBundlePicker bundles={BUNDLES} selected={new Set(['asm'])} onToggle={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: /attack surface management/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByText(/1 product selected/i)).toBeInTheDocument()
  })

  it('shows a skeleton while loading', () => {
    const { container } = render(
      <OnboardingBundlePicker bundles={[]} selected={new Set()} onToggle={vi.fn()} isLoading />
    )
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
  })

  it('renders nothing when the catalog is empty', () => {
    const { container } = render(
      <OnboardingBundlePicker bundles={[]} selected={new Set()} onToggle={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
