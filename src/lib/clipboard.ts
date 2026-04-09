/**
 * Clipboard helper that works in both secure and insecure contexts.
 *
 * The modern `navigator.clipboard.writeText()` API is gated by the
 * Secure Context requirement — it's only available on HTTPS or
 * `localhost`. Self-hosted OpenCTEM deployments often run on plain HTTP
 * over a LAN IP (e.g. `http://192.168.8.204`) where `navigator.clipboard`
 * is `undefined`. Calling `.writeText()` on undefined throws:
 *
 *     can't access property "writeText", navigator.clipboard is undefined
 *
 * This helper feature-detects the modern API and falls back to the
 * deprecated-but-still-supported `document.execCommand('copy')` path
 * via a temporary textarea, which works in any context.
 *
 * @returns true on success, false on failure (so callers can show an
 *          appropriate toast).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Modern path — only works in secure contexts
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Some browsers (Firefox over HTTP, or when the page lost
      // permission focus) expose navigator.clipboard but reject
      // writeText with a NotAllowedError. Fall through to the
      // execCommand path.
    }
  }

  // Fallback: temporary textarea + execCommand. Deprecated but universally
  // supported and not gated by the Secure Context requirement.
  //
  // Critical details we learned the hard way:
  //  - The textarea must be IN the DOM and focusable. `display:none`
  //    or off-screen `top:-9999px` positioning makes some browsers
  //    refuse to copy from it. Use a near-zero-size element near the
  //    viewport instead.
  //  - We must call `.focus()` before `.select()` — without focus,
  //    the selection on some browsers is "owned" by the original
  //    active element (e.g. a button) and the copy is a no-op.
  //  - We must restore focus to the previously active element so the
  //    user doesn't lose their place in the dialog.
  //  - Inside a Radix Dialog/Sheet, the focus guard may try to pull
  //    focus back. We append the textarea to document.body (not the
  //    dialog) so the focus guard sees it as inside the modal already
  //    via the portal hierarchy.
  if (typeof document === 'undefined') return false
  const previousFocus = document.activeElement as HTMLElement | null
  let ok = false
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    // Tiny but on-screen, transparent, and not interactable. Bottom-right
    // corner so it doesn't visually disturb anything during the brief
    // moment it's mounted (single tick — appended → focus → copy →
    // removed).
    textarea.style.position = 'fixed'
    textarea.style.bottom = '0'
    textarea.style.right = '0'
    textarea.style.width = '1px'
    textarea.style.height = '1px'
    textarea.style.padding = '0'
    textarea.style.border = '0'
    textarea.style.outline = 'none'
    textarea.style.boxShadow = 'none'
    textarea.style.background = 'transparent'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    // ARIA hide so it never makes its way into the screen-reader tree.
    textarea.setAttribute('aria-hidden', 'true')
    textarea.setAttribute('tabindex', '-1')

    document.body.appendChild(textarea)
    // Try/finally so we always remove the textarea even if focus throws.
    try {
      textarea.focus({ preventScroll: true })
      textarea.select()
      // Some Android browsers need an explicit selection range.
      textarea.setSelectionRange(0, text.length)
      ok = document.execCommand('copy')
    } finally {
      document.body.removeChild(textarea)
    }
  } catch {
    ok = false
  }

  // Restore focus to whatever the user was on before (button, input, etc.)
  // so the dialog doesn't reset focus to its first focusable element.
  if (previousFocus && typeof previousFocus.focus === 'function') {
    try {
      previousFocus.focus({ preventScroll: true })
    } catch {
      // ignore
    }
  }

  return ok
}
