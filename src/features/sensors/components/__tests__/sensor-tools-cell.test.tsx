import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { SensorToolsCell } from '../sensor-cells'

describe('SensorToolsCell', () => {
  it('marks installed tools the narrowed list leaves out', () => {
    render(<SensorToolsCell tools={['nuclei']} notAllowed={['trivy']} />)
    const tag = screen.getByText('1 not allowed')
    expect(tag).toHaveAttribute('title', 'Installed but not allowed: trivy')
  })

  it('no marker when every reported tool is allowed', () => {
    render(<SensorToolsCell tools={['nuclei', 'trivy']} notAllowed={[]} />)
    expect(screen.queryByText(/not allowed/)).toBeNull()
  })
})
