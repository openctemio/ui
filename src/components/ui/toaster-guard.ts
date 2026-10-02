/**
 * Toasts (sonner) render outside every modal. A Radix modal (Dialog, Sheet)
 * sets `pointer-events: none` on everything outside it and closes on any
 * pointer-down or focus outside, so a toast shown over an open drawer could
 * not be dismissed, and clicking it would have closed the drawer. The CSS in
 * globals.css keeps the toaster clickable; this keeps the modal open when the
 * "outside" interaction is on a toast.
 */
export function isInToaster(target: EventTarget | null): boolean {
  return typeof Element !== 'undefined' && target instanceof Element
    ? target.closest('[data-sonner-toaster]') !== null
    : false
}

/** Wraps a Radix `onInteractOutside` so interactions with a toast are ignored. */
export function ignoreToasterInteractions<
  E extends { target: EventTarget | null; preventDefault(): void },
>(handler?: (event: E) => void): (event: E) => void {
  return (event) => {
    if (isInToaster(event.target)) {
      event.preventDefault()
      return
    }
    handler?.(event)
  }
}
