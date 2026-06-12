import { describe, it, expect } from 'vitest'
import { sanitizeCsvCell } from './use-csv-export'

describe('sanitizeCsvCell', () => {
  it('neutralizes formula-injection triggers', () => {
    expect(sanitizeCsvCell('=1+1')).toBe("'=1+1")
    expect(sanitizeCsvCell('+cmd')).toBe("'+cmd")
    expect(sanitizeCsvCell('-2')).toBe("'-2")
    expect(sanitizeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)")
    // Trigger after leading whitespace must also be caught.
    expect(sanitizeCsvCell('   =1+1')).toBe("'   =1+1")
  })

  it('quotes cells with delimiters and escapes quotes', () => {
    expect(sanitizeCsvCell('a,b')).toBe('"a,b"')
    expect(sanitizeCsvCell('line1\nline2')).toBe('"line1\nline2"')
    expect(sanitizeCsvCell('say "hi"')).toBe('"say ""hi"""')
  })

  it('passes through safe values and handles nullish', () => {
    expect(sanitizeCsvCell('hello')).toBe('hello')
    expect(sanitizeCsvCell(42)).toBe('42')
    expect(sanitizeCsvCell(null)).toBe('')
    expect(sanitizeCsvCell(undefined)).toBe('')
  })

  // Regression: a malicious header (e.g. a user-named custom field) must be
  // sanitized the same as cells — the hook now runs headers through this too.
  it('treats a dangerous header string like any other cell', () => {
    expect(sanitizeCsvCell('=HYPERLINK("http://evil")')).toBe('\'=HYPERLINK("http://evil")')
  })
})
