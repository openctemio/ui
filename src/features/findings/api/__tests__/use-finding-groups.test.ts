/**
 * Finding Groups URL builder tests
 *
 * Covers buildGroupsUrl query-param assembly, in particular the
 * `assigned_to_me` filter behind the "Show only mine" checkbox.
 */

import { describe, it, expect } from 'vitest'
import { buildGroupsUrl } from '../use-finding-groups'

describe('buildGroupsUrl', () => {
  it('always includes the group_by dimension', () => {
    const url = buildGroupsUrl({ group_by: 'cve_id' })
    expect(url.startsWith('/api/v1/findings/groups?')).toBe(true)
    expect(new URLSearchParams(url.split('?')[1]).get('group_by')).toBe('cve_id')
  })

  it('adds assigned_to_me=true when the field is set', () => {
    const url = buildGroupsUrl({ group_by: 'cve_id', assigned_to_me: true })
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('assigned_to_me')).toBe('true')
  })

  it('omits assigned_to_me when the field is false or unset', () => {
    const falseUrl = buildGroupsUrl({ group_by: 'cve_id', assigned_to_me: false })
    expect(new URLSearchParams(falseUrl.split('?')[1]).has('assigned_to_me')).toBe(false)

    const unsetUrl = buildGroupsUrl({ group_by: 'cve_id' })
    expect(new URLSearchParams(unsetUrl.split('?')[1]).has('assigned_to_me')).toBe(false)
  })

  it('preserves other filters alongside assigned_to_me', () => {
    const url = buildGroupsUrl({
      group_by: 'owner_id',
      statuses: 'new,confirmed',
      assigned_to_me: true,
    })
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('group_by')).toBe('owner_id')
    expect(params.get('statuses')).toBe('new,confirmed')
    expect(params.get('assigned_to_me')).toBe('true')
  })
})
