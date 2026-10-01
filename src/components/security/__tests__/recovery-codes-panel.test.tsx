import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RecoveryCodesPanel } from '../recovery-codes-panel'

describe('RecoveryCodesPanel', () => {
  const codes = ['aaaaa-bbbbb', 'ccccc-ddddd']

  it('lists every code', () => {
    render(<RecoveryCodesPanel codes={codes} />)
    const list = screen.getByRole('list', { name: 'Recovery codes' })
    expect(list).toHaveTextContent('aaaaa-bbbbb')
    expect(list).toHaveTextContent('ccccc-ddddd')
  })

  it('copies the codes one per line', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    render(<RecoveryCodesPanel codes={codes} />)
    await user.click(screen.getByRole('button', { name: /copy/i }))
    expect(writeText).toHaveBeenCalledWith('aaaaa-bbbbb\nccccc-ddddd')
  })

  it('downloads a text file', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:x')
    const revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<RecoveryCodesPanel codes={codes} accountLabel="qa@acme.io" />)
    await user.click(screen.getByRole('button', { name: /download/i }))
    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
  })
})
