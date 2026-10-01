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
  // SVG/MathML roots carry their own scriptable surface (animation
  // URL attrs, foreignObject → arbitrary HTML). Not needed for markdown
  // notes, so drop them wholesale. tagName is lower-cased before lookup,
  // hence 'foreignobject'.
  'svg',
  'math',
  'foreignobject',
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
 * Attributes an element may keep, compared lower-cased and with `-`
 * removed so the hast spelling (`colSpan`, `ariaHidden`, `dataCode`) and
 * the raw spelling some plugins write (`colspan`, `aria-hidden`,
 * `data-code`) match the same entry. Everything else is dropped: `style`,
 * `name`, `target`, `srcdoc`, `formaction`, `ping`, `download`, and any
 * attribute `rehype-attr` lets an author invent.
 */
const ALLOWED_ATTRS: ReadonlySet<string> = new Set([
  'href',
  'src',
  'alt',
  'title',
  'width',
  'height',
  'align',
  'colspan',
  'rowspan',
  'start',
  'reversed',
  'type',
  'checked',
  'disabled',
  'ariahidden',
  'arialabel',
  'tabindex',
  'classname',
  'class',
  'id',
  'lang',
  'dir',
  'open',
  'cite',
  'datetime',
  // Footnotes (remark-gfm) and the code-block copy button.
  'datafootnoteref',
  'datafootnotebackref',
  'datafootnotes',
  'datacode',
  'datameta',
  // SVG path data for the preview's own octicons. svg roots are neutralised
  // anyway; kept so a future allowlisted icon keeps working.
  'viewbox',
  'fill',
  'fillrule',
  'd',
])

/**
 * Class names the markdown pipeline itself produces. Any other class is
 * dropped: author-chosen Tailwind utilities (`fixed inset-0 z-50`) would
 * otherwise let a finding description cover the page with a fake sign-in
 * form. Prism's token classes are added after the sanitiser runs, so they
 * need no entry here.
 */
const SAFE_CLASS_RE =
  /^(?:language-[\w-]+|anchor|copied|octicon(?:-[\w-]+)?|markdown-alert(?:-[\w-]+)?|contains-task-list|task-list-item|footnotes|data-footnote-backref|sr-only)$/

/** Prefix for every id the content defines, as GitHub does, so content can
 *  never clobber a global (`window.foo`) or an id the app relies on. */
export const CONTENT_ID_PREFIX = 'user-content-'

/** Input types that may survive (GFM task-list checkboxes). */
const SAFE_INPUT_TYPES: ReadonlySet<string> = new Set(['checkbox'])

/** Interactive elements an author has no business placing in a note. */
const FORM_CONTROL_TAGS: ReadonlySet<string> = new Set([
  'button',
  'textarea',
  'select',
  'option',
  'frame',
  'frameset',
  'applet',
  'noscript',
  'template',
  'dialog',
  'portal',
])

function normaliseAttrName(key: string): string {
  return key.toLowerCase().replace(/-/g, '')
}

function filterClasses(value: unknown): string[] {
  const tokens = Array.isArray(value)
    ? value.map(String)
    : typeof value === 'string'
      ? value.split(/\s+/)
      : []
  return tokens.filter((t) => SAFE_CLASS_RE.test(t))
}

function prefixId(value: unknown): string | undefined {
  if (typeof value !== 'string' || value === '') return undefined
  return value.startsWith(CONTENT_ID_PREFIX) ? value : CONTENT_ID_PREFIX + value
}

function neutralise(node: HastNode): void {
  node.tagName = 'span'
  node.children = []
  node.properties = {}
}

/**
 * In-place sanitiser. Signature deliberately matches
 * `rehype-rewrite`'s `RehypeRewriteOptions["rewrite"]` so it can be
 * passed straight to @uiw/react-markdown-preview's rehypeRewrite prop.
 * It is idempotent, so running it twice (see `rehypeSanitiseTree`) is safe.
 *
 * Decisions, in order:
 *  1. Element-level blocklist (and form controls) → inert <span></span>.
 *  2. Attribute allowlist → drops style, on* handlers, name, target and
 *     anything invented through a `<!--rehype:...-->` comment.
 *  3. URL attrs with non-whitelisted scheme → rewrite to `#`.
 *  4. class → only the classes the pipeline itself emits.
 *  5. id and in-page `#fragment` links → `user-content-` prefix.
 */
export function sanitiseNode(node: HastNode, _index?: number, _parent?: HastNode): void {
  if (!node || node.type !== 'element' || !node.tagName) return

  const tag = node.tagName.toLowerCase()
  if (DANGEROUS_TAGS.has(tag) || FORM_CONTROL_TAGS.has(tag)) {
    neutralise(node)
    return
  }

  if (!node.properties) return
  const props = node.properties

  if (tag === 'input') {
    const type = typeof props.type === 'string' ? props.type.toLowerCase() : ''
    if (!SAFE_INPUT_TYPES.has(type)) {
      neutralise(node)
      return
    }
    props.disabled = true
  }

  for (const key of Object.keys(props)) {
    if (!ALLOWED_ATTRS.has(normaliseAttrName(key))) {
      delete props[key]
    }
  }

  for (const attr of URL_ATTRS) {
    if (attr in props && !isSafeURL(props[attr])) {
      props[attr] = '#'
    }
  }

  // class: merge the raw `class` spelling into hast's `className`, keep only
  // the pipeline's own classes.
  if ('className' in props || 'class' in props) {
    const kept = [...filterClasses(props.className), ...filterClasses(props.class)]
    delete props.class
    if (kept.length > 0) props.className = kept
    else delete props.className
  }

  if ('id' in props) {
    const id = prefixId(props.id)
    if (id) props.id = id
    else delete props.id
  }
  const href = props.href
  if (typeof href === 'string' && href.startsWith('#') && href.length > 1) {
    const target = prefixId(href.slice(1))
    if (target) props.href = '#' + target
  }
}

function walk(node: HastNode): void {
  sanitiseNode(node)
  if (node.children) {
    for (const child of node.children) walk(child)
  }
}

/**
 * Rehype plugin that sanitises the whole tree. @uiw/react-markdown-preview
 * runs `rehype-attr` AFTER its rehypeRewrite hook, so attributes written in a
 * `<!--rehype:style=...&class=...-->` comment are added after `sanitiseNode`
 * has already looked at the element. Plugins passed through the
 * `rehypePlugins` prop run after `rehype-attr`, so this pass sees the final
 * tree (only the trusted Prism highlighter runs later).
 */
export function rehypeSanitiseTree() {
  return (tree: HastNode): void => {
    walk(tree)
  }
}

/**
 * Props every markdown preview in the app must spread onto
 * `MDEditor.Markdown` (and the editor's `previewOptions`). The rehypeRewrite
 * hook sanitises before `rehype-attr`; the rehypePlugins entry sanitises
 * after it.
 */
export const markdownPreviewSecurityProps = {
  rehypeRewrite: sanitiseNode,
  rehypePlugins: [rehypeSanitiseTree],
}
