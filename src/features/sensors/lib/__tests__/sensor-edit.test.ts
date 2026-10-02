import { describe, expect, it } from 'vitest'

import type { Sensor } from '@/lib/api/sensor-types'

import {
  allowedToolsBody,
  allowToolBody,
  isSensorEditDirty,
  reportedToolNames,
  sensorEditDraft,
  sensorUpdateBody,
  toolsInstalledNotAllowed,
  validateSensorEdit,
  zoneChanges,
} from '../sensor-edit'

type S = Parameters<typeof sensorEditDraft>[0]

const base: S = {
  name: 'dmz-01',
  description: 'DMZ scanner',
  status: 'active',
  tools: [],
  max_concurrent_jobs: 5,
  reported: {
    tools: [
      { name: 'trivy', version: '0.58', installed: true },
      { name: 'nuclei', version: '3.3', installed: true },
      { name: 'semgrep', installed: false },
    ],
    capabilities: ['dast', 'sca'],
    max_concurrent_jobs: 4,
    reported_at: '2026-10-01T00:00:00Z',
  },
}
const caps = (tools: string[]) => tools.map((t) => `cap:${t}`)

describe('reportedToolNames', () => {
  it('lists the installed tools, sorted', () => {
    expect(reportedToolNames(base)).toEqual(['nuclei', 'trivy'])
  })
  it('is null before the first report', () => {
    expect(reportedToolNames({ reported: null })).toBeNull()
    expect(reportedToolNames({ reported: { ...base.reported!, tools: null } })).toBeNull()
  })
})

describe('sensorEditDraft', () => {
  it('starts on "all reported tools" when there is no limit', () => {
    const d = sensorEditDraft(base)
    expect(d).toMatchObject({ enabled: true, toolMode: 'all', tools: [], maxJobs: '5' })
  })
  it('starts on "only" with the limit narrowed to installed tools', () => {
    const d = sensorEditDraft({ ...base, tools: ['trivy', 'semgrep'] as Sensor['tools'] })
    expect(d.toolMode).toBe('only')
    expect(d.tools).toEqual(['trivy'])
  })
  it('a disabled sensor starts not enabled', () => {
    expect(sensorEditDraft({ ...base, status: 'disabled' }).enabled).toBe(false)
  })
})

describe('sensorUpdateBody', () => {
  const initial = sensorEditDraft(base)

  it('sends nothing for an untouched form', () => {
    expect(sensorUpdateBody(base, initial, initial, caps)).toEqual({})
    expect(isSensorEditDirty(initial, initial)).toBe(false)
  })

  it('never sends revoked: the switch maps to active / disabled', () => {
    const off = sensorUpdateBody(base, { ...initial, enabled: false }, initial, caps)
    expect(off).toEqual({ status: 'disabled' })
    const dis = sensorEditDraft({ ...base, status: 'disabled' })
    expect(sensorUpdateBody(base, { ...dis, enabled: true }, dis, caps)).toEqual({
      status: 'active',
    })
  })

  it('"only these" sends the allowed tools, no capability limit when the sensor reports them', () => {
    const body = sensorUpdateBody(
      base,
      { ...initial, toolMode: 'only', tools: ['nuclei'] },
      initial,
      caps
    )
    expect(body).toEqual({ tools: ['nuclei'], capabilities: [] })
  })

  it('"all reported tools" clears the limit', () => {
    const limited = sensorEditDraft({ ...base, tools: ['trivy'] as Sensor['tools'] })
    const body = sensorUpdateBody(base, { ...limited, toolMode: 'all' }, limited, caps)
    expect(body).toEqual({ tools: [], capabilities: [] })
  })

  it('derives capabilities from the tools when the sensor reports none', () => {
    const s = { ...base, reported: { ...base.reported!, capabilities: null } }
    const init = sensorEditDraft(s)
    expect(
      sensorUpdateBody(s, { ...init, toolMode: 'only', tools: ['trivy'] }, init, caps)
    ).toEqual({ tools: ['trivy'], capabilities: ['cap:trivy'] })
    const limited = sensorEditDraft({ ...s, tools: ['trivy'] as Sensor['tools'] })
    expect(sensorUpdateBody(s, { ...limited, toolMode: 'all' }, limited, caps)).toEqual({
      tools: [],
      capabilities: ['cap:nuclei', 'cap:trivy'],
    })
  })

  it('sends name, description and the job limit only when changed', () => {
    const body = sensorUpdateBody(
      base,
      { ...initial, name: '  dmz-02 ', maxJobs: '3' },
      initial,
      caps
    )
    expect(body).toEqual({ name: 'dmz-02', max_concurrent_jobs: 3 })
  })
})

describe('validateSensorEdit', () => {
  const initial = sensorEditDraft(base)
  it('requires a name', () => {
    expect(validateSensorEdit({ ...initial, name: ' ' }, initial).name).toBeTruthy()
  })
  it('requires at least one tool in "only" mode', () => {
    expect(
      validateSensorEdit({ ...initial, toolMode: 'only', tools: [] }, initial).tools
    ).toBeTruthy()
  })
  it('bounds the job limit to 1..100', () => {
    for (const v of ['0', '101', '2.5', '', 'x']) {
      expect(validateSensorEdit({ ...initial, maxJobs: v }, initial).maxJobs).toBeTruthy()
    }
    expect(validateSensorEdit({ ...initial, maxJobs: '100' }, initial).maxJobs).toBeUndefined()
  })
})

describe('zoneChanges', () => {
  it('splits joins and leaves', () => {
    const initial = sensorEditDraft(base, ['a', 'b'])
    expect(zoneChanges({ ...initial, zoneIds: ['b', 'c'] }, initial)).toEqual({
      join: ['c'],
      leave: ['a'],
    })
  })
})

describe('allowedToolsBody (review after the first heartbeat)', () => {
  it('sends nothing when every installed tool stays checked', () => {
    expect(allowedToolsBody(base, ['nuclei', 'trivy'], caps)).toBeNull()
  })
  it('sends only the allowed subset when the admin unchecks a tool', () => {
    expect(allowedToolsBody(base, ['trivy'], caps)).toEqual({ tools: ['trivy'], capabilities: [] })
  })
  it('derives capabilities when the sensor reports none', () => {
    const noCaps = { ...base, reported: { ...base.reported!, capabilities: null } }
    expect(allowedToolsBody(noCaps, ['nuclei'], caps)).toEqual({
      tools: ['nuclei'],
      capabilities: ['cap:nuclei'],
    })
  })
  it('ignores tools that are not installed and refuses an empty subset', () => {
    expect(allowedToolsBody(base, ['semgrep'], caps)).toBeNull()
    expect(allowedToolsBody(base, [], caps)).toBeNull()
  })
  it('all checked clears an existing limit (every reported tool)', () => {
    expect(allowedToolsBody({ ...base, tools: ['trivy'] }, ['nuclei', 'trivy'], caps)).toEqual({
      tools: [],
      capabilities: [],
    })
  })
})

describe('toolsInstalledNotAllowed', () => {
  it('is empty without a limit: every reported tool is allowed', () => {
    expect(toolsInstalledNotAllowed(base)).toEqual([])
  })
  it('lists installed tools the narrowed limit leaves out', () => {
    expect(toolsInstalledNotAllowed({ ...base, tools: ['nuclei'] })).toEqual(['trivy'])
  })
  it('is empty before the sensor reports its tools', () => {
    expect(toolsInstalledNotAllowed({ tools: ['nuclei'], reported: null })).toEqual([])
  })
})

describe('allowToolBody', () => {
  it('adds the tool to the limit and keeps it a limit', () => {
    expect(allowToolBody({ ...base, tools: ['nuclei'] }, 'trivy', caps)).toEqual({
      tools: ['nuclei', 'trivy'],
      capabilities: [],
    })
  })
})
