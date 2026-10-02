'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className
      )}
      {...props}
    />
  )
}

/** The close button's look: a 44px hit area, visible focus ring. */
const dialogCloseClassName =
  'ring-offset-background focus-visible:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground rounded-md opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus:outline-hidden disabled:pointer-events-none flex items-center justify-center h-10 w-10 min-h-[44px] min-w-[44px]'

function DialogCloseButton({ className }: { className?: string }) {
  return (
    <DialogPrimitive.Close data-slot="dialog-close" className={cn(dialogCloseClassName, className)}>
      <XIcon className="size-5" aria-hidden />
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  /**
   * The default close button, absolute in the top-right corner. Turn it off
   * when the dialog draws a DialogHeaderBar (which has its own).
   */
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-4 sm:p-6 shadow-lg duration-200 sm:max-w-lg overflow-x-hidden',
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && <DialogCloseButton className="absolute top-3 right-3" />}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

/**
 * The chrome row of a dialog whose body is laid out edge to edge (split
 * panes, a tinted aside, a scrolling body with a sticky footer): title and
 * description on the left, the close button on the right, on the dialog's
 * own surface, above everything else. The body then starts below it, so the
 * close button never lands on a tinted region of the body.
 *
 * Use with `<DialogContent showCloseButton={false} className="flex flex-col gap-0 p-0 sm:p-0 …">`
 * (`sm:p-0` too: DialogContent pads `sm:p-6`)
 * and put DialogTitle / DialogDescription inside.
 */
function DialogHeaderBar({
  className,
  children,
  actions,
  showCloseButton = true,
  ...props
}: React.ComponentProps<'div'> & {
  /** Rendered before the close button (e.g. a status badge). */
  actions?: React.ReactNode
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-header-bar"
      className={cn(
        'bg-background flex shrink-0 items-start gap-3 border-b py-3 ps-4 pe-2 sm:ps-6 sm:pe-3',
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-1.5 text-start">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-2 py-1">{actions}</div>}
      {showCloseButton && <DialogCloseButton className="shrink-0" />}
    </div>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-start', className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogHeaderBar,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
