import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Main, MainRegion } from '../main'

describe('main landmark', () => {
  it('a page <Main> inside the layout region is not a second landmark', () => {
    // Every dashboard page rendered <Main> inside the layout's <main>, so each
    // page had two nested main landmarks.
    render(
      <MainRegion>
        <Main>page</Main>
      </MainRegion>
    )
    const mains = screen.getAllByRole('main')
    expect(mains).toHaveLength(1)
    expect(mains[0]).toHaveAttribute('id', 'content')
    expect(mains[0]).toHaveTextContent('page')
  })

  it('a nested <Main> keeps its layout attributes', () => {
    render(
      <MainRegion>
        <Main fixed data-testid="page" />
      </MainRegion>
    )
    const page = screen.getByTestId('page')
    expect(page.tagName).toBe('DIV')
    expect(page).toHaveAttribute('data-layout', 'fixed')
  })

  it('<Main> is the landmark where no layout provides one', () => {
    render(<Main>login</Main>)
    expect(screen.getByRole('main')).toHaveTextContent('login')
  })

  it('a <Main> inside another <Main> is not a landmark either', () => {
    render(
      <Main>
        <Main>inner</Main>
      </Main>
    )
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })
})
