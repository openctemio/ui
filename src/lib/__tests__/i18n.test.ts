import { describe, it, expect } from 'vitest'
import { getDictionary, translate, getDirFromLocale } from '../i18n'

describe('i18n translate', () => {
  it('resolves a key from the requested locale catalog', () => {
    const vi = getDictionary('vi')
    expect(translate(vi, 'nav.group.scoping')).toBe('Phạm vi')
    expect(translate(vi, 'common.cancel')).toBe('Hủy')
  })

  it('falls back to English when a key is missing from a non-English catalog', () => {
    const vi = getDictionary('vi')
    // A key present in en but (hypothetically) absent from vi resolves to en.
    const partial = { ...vi }
    delete (partial as Record<string, string>)['common.save']
    expect(translate(partial, 'common.save')).toBe('Save')
  })

  it('falls back to the provided fallback, then the key, when absent everywhere', () => {
    const en = getDictionary('en')
    expect(translate(en, 'does.not.exist', 'My Fallback')).toBe('My Fallback')
    expect(translate(en, 'does.not.exist')).toBe('does.not.exist')
  })

  it('interpolates {vars}', () => {
    const en = getDictionary('en')
    expect(translate(en, 'common.rowsExported', undefined, { count: 42 })).toBe('Exported 42 rows')
    const vi = getDictionary('vi')
    expect(translate(vi, 'common.rowsExported', undefined, { count: 42 })).toBe('Đã xuất 42 dòng')
  })

  it('getDictionary falls back to English for an untranslated locale (ar) and strips region', () => {
    expect(getDictionary('ar')).toEqual(getDictionary('en'))
    expect(translate(getDictionary('vi-VN'), 'nav.group.settings')).toBe('Cài đặt')
  })

  it('RTL direction still derives from locale (ar) independent of translation', () => {
    expect(getDirFromLocale('ar')).toBe('rtl')
    expect(getDirFromLocale('vi')).toBe('ltr')
  })
})
