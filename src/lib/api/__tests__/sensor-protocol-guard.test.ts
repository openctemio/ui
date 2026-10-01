import { describe, expect, it } from 'vitest'

import {
  isSensorProtocolPath,
  SENSOR_PROTOCOL_REFUSAL,
  SENSOR_PROTOCOL_REFUSAL_STATUS,
} from '../sensor-protocol-guard'

describe('isSensorProtocolPath', () => {
  it('matches every protocol v1 route a sensor calls', () => {
    for (const p of [
      ['agent', 'heartbeat'],
      ['agent', 'ingest'],
      ['agent', 'ingest', 'chunk'],
      ['agent', 'commands'],
      ['agent', 'commands', 'abc', 'complete'],
      ['agent', 'renew'],
      ['agent'],
    ]) {
      expect(isSensorProtocolPath(p), p.join('/')).toBe(true)
    }
  })

  it('leaves the management API alone', () => {
    for (const p of [
      [],
      ['sensors'],
      ['sensors', 'abc', 'regenerate-key'],
      ['scan-zones'],
      ['findings'],
      ['me', 'agent'],
    ]) {
      expect(isSensorProtocolPath(p), p.join('/')).toBe(false)
    }
  })
})

describe('SENSOR_PROTOCOL_REFUSAL', () => {
  it('is a 421 in the API error shape that says what to change', () => {
    expect(SENSOR_PROTOCOL_REFUSAL_STATUS).toBe(421)
    expect(SENSOR_PROTOCOL_REFUSAL.code).toBe('WRONG_ENDPOINT')
    expect(SENSOR_PROTOCOL_REFUSAL.message).toContain('API_URL')
    expect(SENSOR_PROTOCOL_REFUSAL.message).toContain('not the API')
  })
})
