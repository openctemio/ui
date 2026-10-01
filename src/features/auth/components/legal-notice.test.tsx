import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { LegalNotice } from './legal-notice'

describe('LegalNotice', () => {
  it('renders nothing when no legal documents are configured', () => {
    // The app has no /terms or /privacy page: linking there sent every
    // visitor who clicked to the 404 page.
    const { container } = render(
      <LegalNotice action="clicking sign in" termsUrl="" privacyUrl="" />
    )
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('links to the configured documents', () => {
    render(
      <LegalNotice
        action="clicking sign in"
        termsUrl="https://example.com/terms"
        privacyUrl="https://example.com/privacy"
      />
    )
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute(
      'href',
      'https://example.com/terms'
    )
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      'https://example.com/privacy'
    )
    expect(screen.getByText(/By clicking sign in, you agree to our/)).toBeInTheDocument()
  })

  it('shows only the document that is configured', () => {
    render(
      <LegalNotice action="creating an account" privacyUrl="https://example.com/p" termsUrl="" />
    )
    expect(screen.queryByRole('link', { name: 'Terms of Service' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toBeInTheDocument()
  })
})
