import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeaderBar,
  DialogTitle,
  DialogTrigger,
} from '../dialog'

function SplitDialog({ onOpenChange }: { onOpenChange?: (o: boolean) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        onOpenChange?.(o)
      }}
    >
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent showCloseButton={false} className="flex flex-col gap-0 p-0">
        <DialogHeaderBar>
          <DialogTitle>Install a sensor</DialogTitle>
          <DialogDescription>Step 1 of 4</DialogDescription>
        </DialogHeaderBar>
        <div className="grid grid-cols-2">
          <div>left</div>
          <aside className="bg-muted">right</aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}

describe('DialogHeaderBar', () => {
  it('puts the only close button in the header row, not over the body', async () => {
    const user = userEvent.setup()
    render(<SplitDialog />)
    await user.click(screen.getByRole('button', { name: 'Open' }))

    const closes = screen.getAllByRole('button', { name: 'Close' })
    expect(closes).toHaveLength(1)
    const bar = document.querySelector('[data-slot="dialog-header-bar"]')!
    expect(bar).toContainElement(closes[0])
    expect(closes[0].className).not.toContain('absolute')
    // The bar comes first, before the panes.
    expect(bar.parentElement?.firstElementChild).toBe(bar)
  })

  it('closes on the close button and on Escape, returning focus to the trigger', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<SplitDialog onOpenChange={onOpenChange} />)
    const trigger = screen.getByRole('button', { name: 'Open' })

    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()

    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('leaves the default corner close button of ordinary dialogs alone', async () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Plain</DialogTitle>
          <DialogDescription>Body</DialogDescription>
        </DialogContent>
      </Dialog>
    )
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close.className).toContain('absolute')
    expect(close.className).toContain('top-3')
    expect(close.className).toContain('min-h-[44px]')
  })
})
