/**
 * Markdown/HTML sanitiser used by <MarkdownPreview>.
 *
 * The rendering pipeline (@uiw/react-md-editor → react-markdown →
 * rehype-raw) parses arbitrary HTML embedded in markdown sources into
 * live DOM. Since the markdown source comes from user-controlled
 * fields (finding descriptions, AI-triage rationales, pentest notes,
 * scanner output), we MUST strip the usual XSS vectors before the
 * tree reaches React.
 *
 * Why not rehype-sanitize? That package would add a new top-level
 * dependency (requires lockfile review). The actionable threats for
 * this codebase are a short list — see DANGEROUS_TAGS / URL_ATTRS
 * below — so a focused in-tree sanitiser is cheaper to maintain and
 * easier to audit. If the content universe expands (e.g. user-
 * provided SVG), reconsider.
 */

/** HTML elements that always carry executable power. Neutralised wholesale. */
export const DANGEROUS_TAGS: ReadonlySet<string> = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'style',
  'link',
  'meta',
  'base',
  'form',
])

/** Attributes that hold a URL — need scheme validation. */
export const URL_ATTRS: ReadonlySet<string> = new Set([
  'href',
  'src',
  'xlink:href',
  'action',
  'formaction',
  'poster',
])

/**
 * Permissive scheme whitelist. Anything else (javascript:, data:,
 * vbscript:, blob:, file:, etc.) is rewritten to `#` below. Relative
 * paths and document fragments are intentionally allowed.
 */
const SAFE_URL_RE = /^(?:https?:|mailto:|tel:|#|\/|\.\/|\.\.\/|$)/i

/** Strip control chars + whitespace the browser would otherwise tolerate
 *  in the scheme portion (e.g. "\tjavascript:…" still fires in Chrome). */
function normaliseURL(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().replace(/[\x00-\x20]/g, '')
}

export function isSafeURL(raw: unknown): boolean {
  // Non-string inputs (undefined, numbers, objects from malformed ASTs)
  // are rejected outright so the rewrite step below replaces them with
  // `#` instead of forwarding `String(null)` etc. into the DOM.
  if (typeof raw !== 'string') return false
  return SAFE_URL_RE.test(normaliseURL(raw))
}

/**
 * Minimal hast node shape we rely on. Avoids pulling in @types/hast
 * (not in package.json) while keeping the callback signature typed.
 */
export interface HastNode {
  type?: string
  tagName?: string
  children?: HastNode[]
  properties?: Record<string, unknown>
}

/**
 * In-place sanitiser. Signature deliberately matches
 * `rehype-rewrite`'s `RehypeRewriteOptions["rewrite"]` so it can be
 * passed straight to @uiw/react-markdown-preview's rehypeRewrite prop.
 *
 * Decisions, in order:
 *  1. Element-level blocklist → convert to inert <span></span>.
 *  2. Event-handler attrs (on*) → delete.
 *  3. URL attrs with non-whitelisted scheme → rewrite to `#`.
 *  4. Inline `style` attr → delete (CSS-url(javascript:), expression(), etc.).
 */
export function sanitiseNode(node: HastNode, _index?: number, _parent?: HastNode): void {
  if (!node || node.type !== 'element' || !node.tagName) return

  const tag = node.tagName.toLowerCase()
  if (DANGEROUS_TAGS.has(tag)) {
    node.tagName = 'span'
    node.children = []
    if (node.properties) node.properties = {}
    return
  }

  if (!node.properties) return
  const props = node.properties

  for (const key of Object.keys(props)) {
    if (key.toLowerCase().startsWith('on')) {
      delete props[key]
    }
  }

  for (const attr of URL_ATTRS) {
    if (attr in props && !isSafeURL(props[attr])) {
      props[attr] = '#'
    }
  }

  if ('style' in props) {
    delete props['style']
  }
}
