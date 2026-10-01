import { describe, expect, it } from 'vitest'

import {
  canonicalAuditAction,
  canonicalAuditMetadataKey,
  canonicalAuditResourceType,
  getActionLabel,
  SENSOR_AUDIT_VERBS,
} from '../audit-types'
import { formatAction } from '@/features/organization/types/audit.types'

/**
 * Audit rows written before the agent -> sensor rename keep agent.*, resource
 * type "agent" and agent_* metadata forever (hash-chained). The API returns
 * them as written, so the UI must label both spellings the same way.
 */
describe('sensor audit events before and after the rename', () => {
  it.each(SENSOR_AUDIT_VERBS)('labels agent.%s like sensor.%s', (verb) => {
    const historical = `agent.${verb}` as const
    const current = `sensor.${verb}` as const
    expect(canonicalAuditAction(historical)).toBe(current)
    expect(getActionLabel(historical)).toBe(getActionLabel(current))
    expect(getActionLabel(current)).not.toBe(current)
    expect(getActionLabel(current)).toMatch(/^Sensor /)
    expect(formatAction(historical)).toBe(formatAction(current))
  })

  it('labels sensor.created as "Sensor Created" on the settings audit page', () => {
    expect(formatAction('sensor.created')).toBe('Sensor Created')
    expect(formatAction('agent.created')).toBe('Sensor Created')
    expect(formatAction('agent.key_regenerated')).toBe('Sensor Key Regenerated')
  })

  it('leaves every other action alone', () => {
    expect(canonicalAuditAction('finding.created')).toBe('finding.created')
    expect(canonicalAuditAction('user_agent.created')).toBe('user_agent.created')
    expect(getActionLabel('finding.created')).toBe('Finding Created')
  })

  it('maps the resource type "agent" onto "sensor" and nothing else', () => {
    expect(canonicalAuditResourceType('agent')).toBe('sensor')
    expect(canonicalAuditResourceType('sensor')).toBe('sensor')
    expect(canonicalAuditResourceType('finding')).toBe('finding')
  })

  it('maps the pre-rename metadata keys onto sensor_*', () => {
    expect(canonicalAuditMetadataKey('agent_type')).toBe('sensor_type')
    expect(canonicalAuditMetadataKey('agent_id')).toBe('sensor_id')
    expect(canonicalAuditMetadataKey('agent_name')).toBe('sensor_name')
    expect(canonicalAuditMetadataKey('sensor_id')).toBe('sensor_id')
    // Only the three keys the contract names; an unrelated key is not touched.
    expect(canonicalAuditMetadataKey('agent_version')).toBe('agent_version')
    expect(canonicalAuditMetadataKey('user_agent')).toBe('user_agent')
  })
})
