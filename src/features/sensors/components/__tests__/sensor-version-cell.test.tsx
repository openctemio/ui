import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { SensorVersionCell, type SensorVersionFields } from '../sensor-cells'
import { sdkVersionOptions } from '../sensor-facet-panel'

function cell(sensor: SensorVersionFields, extra: Record<string, string> = {}) {
  const { container } = render(
    <SensorVersionCell sensor={sensor} latest="v0.5.0" min="v0.4.0" {...extra} />
  )
  return container
}

describe('SensorVersionCell', () => {
  it('reads "Sensor v0.5.0 · SDK v0.9.0" with the build facts in the tooltip', () => {
    const c = cell({
      version: '0.5.0',
      sdk_name: 'openctem-sdk-go',
      sdk_version: 'v0.9.0',
      sdk_status: 'current',
      sensor_product: 'openctemio-sensor',
      sensor_commit: 'abc1234',
      sensor_build_time: '2026-09-30T10:00:00Z',
    })
    expect(c.textContent).toContain('Sensor v0.5.0 · SDK v0.9.0')
    const tip = c.querySelector('[title*="Product"]')
    expect(tip?.getAttribute('title')).toContain('Product: openctemio-sensor')
    expect(tip?.getAttribute('title')).toContain('Commit: abc1234')
    expect(tip?.getAttribute('title')).toContain('Built: ')
    expect(tip?.getAttribute('title')).toContain('SDK: openctem-sdk-go v0.9.0')
    // A current SDK carries no SDK tag.
    expect(screen.queryByText(/SDK (outdated|unsupported)/)).toBeNull()
    expect(screen.getByText('latest')).toBeInTheDocument()
  })

  it('leaves out the parts that are not reported', () => {
    expect(cell({ version: 'v0.4.2' }).textContent).toContain('Sensor v0.4.2')
    expect(cell({ version: 'v0.4.2' }).textContent).not.toContain('SDK')
    expect(cell({ sdk_version: '0.9.0', sdk_status: 'current' }).textContent).toBe('SDK v0.9.0')
    expect(cell({ version: '', sdk_version: '' }).textContent).toBe('Not reported')
  })

  it('warns when the SDK is outdated (warning) or unsupported (destructive)', () => {
    cell(
      { version: 'v0.5.0', sdk_version: 'v0.8.0', sdk_status: 'outdated' },
      { sdkLatest: 'v0.9.0' }
    )
    const outdated = screen.getByText('SDK outdated')
    expect(outdated.className).toContain('text-warning')
    expect(outdated).toHaveAttribute('title', 'SDK v0.9.0 is available')

    cell(
      { version: 'v0.5.0', sdk_version: 'v0.6.0', sdk_status: 'unsupported' },
      { sdkMin: 'v0.8.0' }
    )
    const unsupported = screen.getByText('SDK unsupported')
    expect(unsupported.className).toContain('text-destructive')
    expect(unsupported).toHaveAttribute('title', 'Older than the minimum supported SDK v0.8.0')
  })
})

describe('sdkVersionOptions', () => {
  it('lists the stats versions newest first, "unknown" last, and keeps a stale selection', () => {
    expect(
      sdkVersionOptions({ unknown: 1, 'v0.8.1': 2, 'v0.9.0': 3 }, ['v0.7.0']).map((o) => [
        o.value,
        o.count,
      ])
    ).toEqual([
      ['v0.9.0', 3],
      ['v0.8.1', 2],
      ['v0.7.0', null],
      ['unknown', 1],
    ])
    expect(sdkVersionOptions(undefined)).toEqual([])
  })
})
