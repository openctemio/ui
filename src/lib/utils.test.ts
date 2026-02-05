/**
 * Utility Functions Tests
 *
 * Comprehensive tests for slugify, generateStepKey, generateTempStepId
 * with focus on security edge cases
 */

import { describe, it, expect } from 'vitest'
import { slugify, generateStepKey, generateTempStepId, getPageNumbers } from './utils'

// ============================================
// SLUGIFY TESTS
// ============================================

describe('slugify', () => {
  describe('basic functionality', () => {
    it('converts to lowercase', () => {
      expect(slugify('HELLO WORLD')).toBe('hello-world')
    })

    it('replaces spaces with hyphens', () => {
      expect(slugify('hello world')).toBe('hello-world')
    })

    it('removes underscores (not valid in slug)', () => {
      // Underscores are removed because regex is /[^a-z0-9\s-]/g
      expect(slugify('hello_world')).toBe('helloworld')
    })

    it('removes leading and trailing hyphens', () => {
      expect(slugify('--hello-world--')).toBe('hello-world')
    })

    it('collapses multiple hyphens', () => {
      expect(slugify('hello---world')).toBe('hello-world')
    })

    it('trims whitespace', () => {
      expect(slugify('  hello world  ')).toBe('hello-world')
    })

    it('handles mixed separators', () => {
      expect(slugify('hello - _ world')).toBe('hello-world')
    })
  })

  describe('maxLength parameter', () => {
    it('truncates to maxLength', () => {
      expect(slugify('a very long string that should be truncated', 10)).toBe('a-very-lon')
    })

    it('uses default maxLength of 40', () => {
      const longString = 'a'.repeat(50)
      expect(slugify(longString).length).toBe(40)
    })

    it('does not truncate short strings', () => {
      expect(slugify('short', 40)).toBe('short')
    })
  })

  describe('security: ASCII only (no Unicode bypass)', () => {
    it('removes Vietnamese characters', () => {
      expect(slugify('Tên công cụ')).toBe('tn-cng-c')
    })

    it('removes Chinese characters', () => {
      expect(slugify('测试工具')).toBe('')
    })

    it('removes Japanese characters', () => {
      expect(slugify('テスト')).toBe('')
    })

    it('removes Cyrillic characters', () => {
      expect(slugify('Тест')).toBe('')
    })

    it('removes Arabic characters', () => {
      expect(slugify('اختبار')).toBe('')
    })

    it('removes emojis', () => {
      expect(slugify('hello 👋 world')).toBe('hello-world')
    })

    it('removes homoglyph characters (lookalikes)', () => {
      // Cyrillic 'а' (U+0430) looks like Latin 'a' but should be removed
      expect(slugify('tеst')).toBe('tst') // 'е' is Cyrillic
    })

    it('handles mixed Unicode and ASCII', () => {
      expect(slugify('hello世界world')).toBe('helloworld')
    })
  })

  describe('special characters removal', () => {
    it('removes punctuation', () => {
      expect(slugify('hello!@#$%^&*()world')).toBe('helloworld')
    })

    it('removes quotes', () => {
      expect(slugify('hello"world\'test')).toBe('helloworldtest')
    })

    it('removes brackets', () => {
      expect(slugify('hello[world](test)')).toBe('helloworldtest')
    })

    it('removes slashes and backslashes', () => {
      expect(slugify('hello/world\\test')).toBe('helloworldtest')
    })

    it('keeps numbers', () => {
      expect(slugify('test123')).toBe('test123')
    })

    it('handles tool names with versions', () => {
      expect(slugify('semgrep-v1.2.3')).toBe('semgrep-v123')
    })
  })

  describe('edge cases and input validation', () => {
    it('returns empty string for null', () => {
      expect(slugify(null as unknown as string)).toBe('')
    })

    it('returns empty string for undefined', () => {
      expect(slugify(undefined as unknown as string)).toBe('')
    })

    it('returns empty string for empty string', () => {
      expect(slugify('')).toBe('')
    })

    it('returns empty string for whitespace only', () => {
      expect(slugify('   ')).toBe('')
    })

    it('returns empty string for special chars only', () => {
      expect(slugify('!@#$%')).toBe('')
    })

    it('handles number input', () => {
      expect(slugify(123 as unknown as string)).toBe('')
    })

    it('handles object input', () => {
      expect(slugify({} as unknown as string)).toBe('')
    })

    it('handles array input', () => {
      expect(slugify([] as unknown as string)).toBe('')
    })
  })

  describe('real-world tool names', () => {
    it('handles Semgrep', () => {
      expect(slugify('Semgrep')).toBe('semgrep')
    })

    it('handles Nuclei Scanner', () => {
      expect(slugify('Nuclei Scanner')).toBe('nuclei-scanner')
    })

    it('handles OWASP ZAP', () => {
      expect(slugify('OWASP ZAP')).toBe('owasp-zap')
    })

    it('handles Trivy (Container)', () => {
      expect(slugify('Trivy (Container)')).toBe('trivy-container')
    })

    it('handles git-secrets', () => {
      expect(slugify('git-secrets')).toBe('git-secrets')
    })

    it('handles TruffleHog v3', () => {
      expect(slugify('TruffleHog v3')).toBe('trufflehog-v3')
    })
  })
})

// ============================================
// GENERATE STEP KEY TESTS
// ============================================

describe('generateStepKey', () => {
  describe('format validation', () => {
    it('returns format: slug-nanoid', () => {
      const key = generateStepKey('Semgrep')
      expect(key).toMatch(/^semgrep-[A-Za-z0-9_-]{8}$/)
    })

    it('generates 8-character nanoid suffix', () => {
      const key = generateStepKey('test')
      const parts = key.split('-')
      expect(parts[parts.length - 1]).toHaveLength(8)
    })

    it('uses step- prefix for empty/invalid input', () => {
      const key = generateStepKey('')
      expect(key).toMatch(/^step-[A-Za-z0-9_-]{8}$/)
    })

    it('uses step- prefix for Unicode-only input', () => {
      const key = generateStepKey('测试')
      expect(key).toMatch(/^step-[A-Za-z0-9_-]{8}$/)
    })
  })

  describe('uniqueness', () => {
    it('generates unique keys for same input', () => {
      const keys = new Set<string>()
      for (let i = 0; i < 100; i++) {
        keys.add(generateStepKey('test'))
      }
      expect(keys.size).toBe(100)
    })

    it('generates unique keys for different inputs', () => {
      const key1 = generateStepKey('semgrep')
      const key2 = generateStepKey('nuclei')
      expect(key1).not.toBe(key2)
    })
  })

  describe('slug preservation', () => {
    it('preserves tool name in key', () => {
      const key = generateStepKey('Semgrep Scanner')
      expect(key.startsWith('semgrep-scanner-')).toBe(true)
    })

    it('handles long tool names', () => {
      const longName = 'a'.repeat(50)
      const key = generateStepKey(longName)
      // slug is max 40 chars + hyphen + 8 char nanoid = max 49 chars
      expect(key.length).toBeLessThanOrEqual(49)
    })
  })

  describe('security: character validation', () => {
    it('only contains URL-safe characters', () => {
      const key = generateStepKey('Test Tool!')
      // nanoid uses A-Za-z0-9_- so we need case-insensitive match
      expect(key).toMatch(/^[a-zA-Z0-9_-]+$/)
    })

    it('nanoid suffix is URL-safe', () => {
      for (let i = 0; i < 50; i++) {
        const key = generateStepKey('test')
        // nanoid alphabet: A-Za-z0-9_-
        expect(key).toMatch(/^[a-zA-Z0-9_-]+$/)
      }
    })
  })

  describe('real-world scenarios', () => {
    it('handles drag-drop from palette', () => {
      const key = generateStepKey('Semgrep')
      expect(key).toMatch(/^semgrep-[A-Za-z0-9_-]{8}$/)
    })

    it('handles user-typed step name', () => {
      const key = generateStepKey('My Custom Scanner Step')
      expect(key.startsWith('my-custom-scanner-step-')).toBe(true)
    })
  })
})

// ============================================
// GENERATE TEMP STEP ID TESTS
// ============================================

describe('generateTempStepId', () => {
  describe('format validation', () => {
    it('returns format: temp-nanoid', () => {
      const id = generateTempStepId()
      expect(id).toMatch(/^temp-[A-Za-z0-9_-]{12}$/)
    })

    it('starts with temp- prefix', () => {
      const id = generateTempStepId()
      expect(id.startsWith('temp-')).toBe(true)
    })

    it('has 12-character nanoid suffix', () => {
      const id = generateTempStepId()
      const suffix = id.replace('temp-', '')
      expect(suffix).toHaveLength(12)
    })

    it('total length is 17 characters', () => {
      const id = generateTempStepId()
      expect(id).toHaveLength(17) // "temp-" (5) + nanoid(12)
    })
  })

  describe('uniqueness', () => {
    it('generates unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 1000; i++) {
        ids.add(generateTempStepId())
      }
      expect(ids.size).toBe(1000)
    })
  })

  describe('security: temp prefix identification', () => {
    it('can be identified as temporary', () => {
      const id = generateTempStepId()
      expect(id.startsWith('temp-')).toBe(true)
    })

    it('is distinguishable from UUID', () => {
      const id = generateTempStepId()
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(uuidRegex.test(id)).toBe(false)
    })
  })

  describe('character set validation', () => {
    it('only contains URL-safe characters', () => {
      for (let i = 0; i < 100; i++) {
        const id = generateTempStepId()
        expect(id).toMatch(/^[a-zA-Z0-9_-]+$/)
      }
    })
  })
})

// ============================================
// GET PAGE NUMBERS TESTS
// ============================================

describe('getPageNumbers', () => {
  describe('small datasets (≤5 pages)', () => {
    it('returns all pages for 1 page', () => {
      expect(getPageNumbers(1, 1)).toEqual([1])
    })

    it('returns all pages for 3 pages', () => {
      expect(getPageNumbers(1, 3)).toEqual([1, 2, 3])
    })

    it('returns all pages for 5 pages', () => {
      expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe('near beginning', () => {
    it('shows first pages with ellipsis', () => {
      expect(getPageNumbers(1, 10)).toEqual([1, 2, 3, 4, '...', 10])
    })

    it('shows first pages when on page 2', () => {
      expect(getPageNumbers(2, 10)).toEqual([1, 2, 3, 4, '...', 10])
    })

    it('shows first pages when on page 3', () => {
      expect(getPageNumbers(3, 10)).toEqual([1, 2, 3, 4, '...', 10])
    })
  })

  describe('in middle', () => {
    it('shows surrounding pages with ellipsis on both sides', () => {
      expect(getPageNumbers(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10])
    })

    it('works for page 6 of 10', () => {
      expect(getPageNumbers(6, 10)).toEqual([1, '...', 5, 6, 7, '...', 10])
    })
  })

  describe('near end', () => {
    it('shows last pages with ellipsis', () => {
      expect(getPageNumbers(10, 10)).toEqual([1, '...', 7, 8, 9, 10])
    })

    it('shows last pages when on page 9', () => {
      expect(getPageNumbers(9, 10)).toEqual([1, '...', 7, 8, 9, 10])
    })

    it('shows last pages when on page 8', () => {
      expect(getPageNumbers(8, 10)).toEqual([1, '...', 7, 8, 9, 10])
    })
  })
})
