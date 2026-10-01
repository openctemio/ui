import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const copyToClipboard = vi.fn(async (_text: string) => true)
vi.mock('@/lib/clipboard', () => ({ copyToClipboard: (t: string) => copyToClipboard(t) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { OneTimeSecretField } from '../one-time-secret-field'

describe('OneTimeSecretField', () => {
  it('labels the input and both icon buttons', () => {
    render(<OneTimeSecretField label="API key" value="oct_secret" />)

    const input = screen.getByLabelText('API key')
    expect(input).toHaveValue('oct_secret')
    expect(input).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Show API key' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy API key' })).toBeInTheDocument()
  })

  it('reveals the secret and renames the toggle', () => {
    render(<OneTimeSecretField label="API key" value="oct_secret" />)
    fireEvent.click(screen.getByRole('button', { name: 'Show API key' }))
    expect(screen.getByLabelText('API key')).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide API key' })).toBeInTheDocument()
  })

  it('copies the value and says so', async () => {
    render(<OneTimeSecretField label="New API key" noun="API key" value="oct_secret" />)
    expect(screen.getByLabelText('New API key')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Copy API key' }))
    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith('oct_secret'))
    expect(await screen.findByRole('button', { name: 'API key copied' })).toBeInTheDocument()
  })
})
