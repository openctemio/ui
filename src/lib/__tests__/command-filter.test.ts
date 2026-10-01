import { describe, expect, it } from 'vitest'
import { commandFilter } from '../command-filter'

describe('commandFilter', () => {
  it('requires every query word', () => {
    expect(commandFilter('API keys (Access)', 'api keys')).toBeGreaterThan(0)
    expect(commandFilter('Business Impact', 'siem')).toBe(0)
    expect(commandFilter('Preferences (My account)', 'audit', ['theme', 'dark mode'])).toBe(0)
  })

  it('ranks label prefix > word prefix > inside label > keyword only', () => {
    const prefix = commandFilter('Audit log (Organization)', 'audit')
    const word = commandFilter('Scan profiles (Scanning)', 'profiles')
    const inside = commandFilter('Notification channels', 'cation')
    const kw = commandFilter('Source credentials (Scanning)', 'secret', ['secret store'])
    expect(prefix).toBe(1)
    expect(word).toBe(0.9)
    expect(inside).toBe(0.7)
    expect(kw).toBe(0.4)
  })

  it('ignores case and accents, and an empty query matches everything', () => {
    expect(commandFilter('Khóa API', 'khoa')).toBeGreaterThan(0)
    expect(commandFilter('SIEM (Integrations)', 'SiEm')).toBe(1)
    expect(commandFilter('Anything', '  ')).toBe(1)
  })
})
