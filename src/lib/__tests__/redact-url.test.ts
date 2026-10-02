import { describe, expect, it } from 'vitest'

import { redactUrlQueries } from '../redact-url'

describe('redactUrlQueries', () => {
  it('drops the query string of a signed URL, keeping scheme, host and path', () => {
    const err =
      'resolve: checksums: Get "https://release-assets.githubusercontent.com/github-production-release-asset/253044228/35da6c58?sp=r&sv=2018-11-09&sig=SECRET&se=2026-10-02T09%3A01%3A49Z": EOF'
    const out = redactUrlQueries(err)
    expect(out).toBe(
      'resolve: checksums: Get "https://release-assets.githubusercontent.com/github-production-release-asset/253044228/35da6c58?…": EOF'
    )
    expect(out).not.toContain('SECRET')
  })

  it('handles a URL cut off mid-query, fragments and several URLs', () => {
    expect(redactUrlQueries('Get "https://h.example/a?token=abc')).toBe(
      'Get "https://h.example/a?…'
    )
    expect(redactUrlQueries('see http://a.example/x#frag and https://b.example/y?k=v')).toBe(
      'see http://a.example/x?… and https://b.example/y?…'
    )
  })

  it('leaves text without a query string alone', () => {
    expect(redactUrlQueries('mirror.gcr.io/aquasec/trivy-db')).toBe(
      'mirror.gcr.io/aquasec/trivy-db'
    )
    expect(redactUrlQueries('https://h.example/path')).toBe('https://h.example/path')
    expect(redactUrlQueries('')).toBe('')
    expect(redactUrlQueries(undefined)).toBeUndefined()
  })
})
