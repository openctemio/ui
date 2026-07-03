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
  // It contains embedded quotes, so it must be BOTH formula-prefixed AND
  // quote-wrapped/escaped (the old output left the quotes unescaped = malformed).
  it('treats a dangerous header string like any other cell', () => {
    expect(sanitizeCsvCell('=HYPERLINK("http://evil")')).toBe('"\'=HYPERLINK(""http://evil"")"')
  })

  // Regression (structure corruption): a value that is BOTH a formula trigger
  // AND contains a delimiter must be quote-prefixed AND wrapped, so the comma/
  // newline can't leak into the grid and shift columns/rows.
  it('wraps formula-prefixed cells that also contain a delimiter', () => {
    expect(sanitizeCsvCell('-hello, world')).toBe('"\'-hello, world"')
    expect(sanitizeCsvCell('@security-team, ops')).toBe('"\'@security-team, ops"')
    expect(sanitizeCsvCell('=line1\nline2')).toBe('"\'=line1\nline2"')
  })

  // A lone carriage return must also force quoting (RFC 4180 row separator).
  it('quotes cells containing a bare carriage return', () => {
    expect(sanitizeCsvCell('a\rb')).toBe('"a\rb"')
  })
})
