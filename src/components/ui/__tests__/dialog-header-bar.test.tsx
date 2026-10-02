import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeaderBar,
  DialogTitle,
  DialogTrigger,
  focusDialogBody,
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

function FormDialog({ withField = true }: { withField?: boolean }) {
  const [open, setOpen] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(e) => focusDialogBody(e, body.current)}
      >
        <DialogHeaderBar>
          <DialogTitle>Edit sensor</DialogTitle>
          <DialogDescription>dmz-01</DialogDescription>
        </DialogHeaderBar>
        <div ref={body} tabIndex={-1} data-testid="body">
          <p>About</p>
          {withField && <input aria-label="Name" />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

describe('focusDialogBody', () => {
  const realMatchMedia = window.matchMedia
  afterEach(() => {
    window.matchMedia = realMatchMedia
  })
  const pointer = (coarse: boolean) => {
    window.matchMedia = ((q: string) => ({
      matches: coarse && q.includes('coarse'),
      media: q,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia
  }

  it('opens on the first field, not on the close button; Escape returns focus', async () => {
    pointer(false)
    const user = userEvent.setup()
    render(<FormDialog />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Close' })).not.toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('keeps the caret at the end when the focus trap refocuses the field selected', async () => {
    pointer(false)
    const user = userEvent.setup()
    render(<FormDialog />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    const name = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement
    await user.type(name, 'dmz-01')
    // What Radix FocusScope does when focus comes back into the dialog.
    name.blur()
    name.focus()
    name.select()
    await new Promise((r) => setTimeout(r, 5))
    expect(name.selectionStart).toBe(6)
    expect(name.selectionEnd).toBe(6)
  })

  it('focuses the body when there is no field', async () => {
    pointer(false)
    const user = userEvent.setup()
    render(<FormDialog withField={false} />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByTestId('body')).toHaveFocus()
  })

  it('on a touch screen focuses the body, so the keyboard does not pop up', async () => {
    pointer(true)
    const user = userEvent.setup()
    render(<FormDialog />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByTestId('body')).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveFocus()
  })
})
