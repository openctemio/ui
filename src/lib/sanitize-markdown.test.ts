/**
 * Markdown sanitiser tests.
 *
 * Each test pins one of the XSS vectors the sanitiser is supposed to
 * block. If any of these starts failing, a MarkdownPreview render path
 * somewhere in the app is now vulnerable to stored XSS — the content
 * that lands in these nodes is user-controlled (finding descriptions,
 * scanner output, AI-triage rationales, pentest notes).
 */

import { describe, it, expect } from 'vitest'
import {
  sanitiseNode,
  isSafeURL,
  DANGEROUS_TAGS,
  URL_ATTRS,
  type HastNode,
} from './sanitize-markdown'

// --- helpers --------------------------------------------------------------

function element(tagName: string, properties: Record<string, unknown> = {}): HastNode {
  return { type: 'element', tagName, properties, children: [] }
}

// --- isSafeURL ------------------------------------------------------------

describe('isSafeURL', () => {
  it.each([
    ['https://example.com', true],
    ['http://example.com/path?q=1', true],
    ['mailto:a@b.c', true],
    ['tel:+1234', true],
    ['#section', true],
    ['/local/path', true],
    ['./rel', true],
    ['../rel', true],
    ['', true], // empty matches $ anchor; React renders nothing for href=""
  ])('allows safe URL %o', (url, want) => {
    expect(isSafeURL(url)).toBe(want)
  })

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'vbscript:msgbox()',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'blob:https://evil/uuid',
  ])('rejects dangerous scheme %o', (url) => {
    expect(isSafeURL(url)).toBe(false)
  })

  it('rejects scheme with leading control chars and whitespace', () => {
    // Chrome tolerates "\tjavascript:…" — the sanitiser MUST strip the
    // tab before scheme matching, otherwise a naive regex passes it.
    expect(isSafeURL('\tjavascript:alert(1)')).toBe(false)
    expect(isSafeURL(' javascript:alert(1)')).toBe(false)
    expect(isSafeURL('\x00javascript:alert(1)')).toBe(false)
  })

  it('rejects non-string inputs', () => {
    expect(isSafeURL(undefined)).toBe(false)
    expect(isSafeURL(null)).toBe(false)
    expect(isSafeURL(42)).toBe(false)
    expect(isSafeURL({ href: 'https://x' })).toBe(false)
  })
})

// --- sanitiseNode: element-level blocklist --------------------------------

describe('sanitiseNode — dangerous elements', () => {
  it.each([...DANGEROUS_TAGS])('neutralises <%s>', (tag) => {
    const node = element(tag, { src: 'https://evil' })
    node.children = [{ type: 'text' }]
    sanitiseNode(node)
    expect(node.tagName).toBe('span')
    expect(node.children).toEqual([])
    expect(node.properties).toEqual({})
  })

  it('neutralises uppercased SCRIPT', () => {
    // hast lowercases tag names in practice, but a hand-rolled
    // consumer could pass raw input. Defence in depth.
    const node = element('SCRIPT')
    sanitiseNode(node)
    expect(node.tagName).toBe('span')
  })

  it('neutralises <svg> and drops its scriptable children', () => {
    // <svg><animate attributeName="href" to="javascript:alert(1)"> is a
    // real SVG XSS vector (SMIL animation of a URL attribute). The svg
    // root is in DANGEROUS_TAGS, so it becomes an inert <span> and its
    // <animate> child is dropped before it can reach the DOM.
    const animate = element('animate', {
      attributeName: 'href',
      to: 'javascript:alert(1)',
      from: 'javascript:alert(2)',
      values: 'javascript:alert(3)',
    })
    const svg = element('svg')
    svg.children = [animate]
    sanitiseNode(svg)
    expect(svg.tagName).toBe('span')
    expect(svg.children).toEqual([])
    expect(svg.properties).toEqual({})
  })

  it('neutralises <math> and <foreignObject>', () => {
    for (const tag of ['math', 'foreignObject']) {
      const node = element(tag)
      node.children = [{ type: 'text' }]
      sanitiseNode(node)
      expect(node.tagName).toBe('span')
      expect(node.children).toEqual([])
    }
  })

  it('leaves safe elements and pipeline classes untouched', () => {
    const node = element('code', { className: ['language-go'] })
    sanitiseNode(node)
    expect(node.tagName).toBe('code')
    expect(node.properties).toEqual({ className: ['language-go'] })
  })
})

// --- sanitiseNode: event handlers -----------------------------------------

describe('sanitiseNode — event-handler attributes', () => {
  it('strips onerror on <img>', () => {
    const node = element('img', { src: 'x', onerror: 'fetch("/evil")' })
    sanitiseNode(node)
    expect(node.properties).not.toHaveProperty('onerror')
    expect(node.properties?.src).toBe('#') // src "x" isn't http/mailto/etc → rewritten
  })

  it('strips mixed-case handlers (onClick, OnLoad, onMouseOver)', () => {
    const node = element('a', {
      href: 'https://ok',
      onClick: 'x()',
      OnLoad: 'x()',
      onMouseOver: 'x()',
    })
    sanitiseNode(node)
    expect(Object.keys(node.properties || {})).toEqual(['href'])
  })

  it('does not strip "on" as a non-handler word', () => {
    // This is defence against over-matching: the prefix check targets
    // attributes that start with "on", which legitimately covers
    // HTML handlers; there is no stock HTML attribute named just "on"
    // so dropping it is acceptable. Pinning the behaviour here in
    // case someone extends the rule.
    const node = element('span', { on: 'keep-or-drop' })
    sanitiseNode(node)
    expect(node.properties).not.toHaveProperty('on')
  })
})

// --- sanitiseNode: URL attributes -----------------------------------------

describe('sanitiseNode — URL attributes', () => {
  it.each([...URL_ATTRS])('never forwards javascript: in %s', (attr) => {
    // href/src are rewritten to '#'; the others are not on the attribute
    // allowlist and are removed outright.
    const node = element('a', { [attr]: 'javascript:alert(1)' })
    sanitiseNode(node)
    const v = node.properties?.[attr]
    expect(v === undefined || v === '#').toBe(true)
  })

  it('keeps legitimate href untouched', () => {
    const node = element('a', { href: 'https://example.com/x' })
    sanitiseNode(node)
    expect(node.properties?.href).toBe('https://example.com/x')
  })

  it('neutralises whitespace-prefixed javascript: href', () => {
    const node = element('a', { href: '\t javascript:alert(1)' })
    sanitiseNode(node)
    expect(node.properties?.href).toBe('#')
  })

  it('rewrites data: in <img src>', () => {
    const node = element('img', { src: 'data:text/html,<script>alert(1)</script>' })
    sanitiseNode(node)
    expect(node.properties?.src).toBe('#')
  })
})

// --- sanitiseNode: inline style -------------------------------------------

describe('sanitiseNode — inline style', () => {
  it('strips the style attribute entirely', () => {
    const node = element('div', { style: 'background: url(javascript:alert(1))' })
    sanitiseNode(node)
    expect(node.properties).not.toHaveProperty('style')
  })

  it('strips style on safe elements too', () => {
    const node = element('p', { style: 'color: red', className: 'anchor' })
    sanitiseNode(node)
    expect(node.properties?.className).toEqual(['anchor'])
    expect(node.properties).not.toHaveProperty('style')
  })
})

// --- sanitiseNode: no-ops -------------------------------------------------

describe('sanitiseNode — no-op branches', () => {
  it('ignores non-element nodes (text)', () => {
    const node: HastNode = { type: 'text' }
    expect(() => sanitiseNode(node)).not.toThrow()
  })

  it('ignores element nodes without tagName', () => {
    const node: HastNode = { type: 'element' }
    expect(() => sanitiseNode(node)).not.toThrow()
  })

  it('ignores null/undefined node', () => {
    expect(() => sanitiseNode(undefined as unknown as HastNode)).not.toThrow()
    expect(() => sanitiseNode(null as unknown as HastNode)).not.toThrow()
  })

  it('ignores element nodes without properties', () => {
    const node: HastNode = { type: 'element', tagName: 'p' }
    expect(() => sanitiseNode(node)).not.toThrow()
  })
})

// --- sanitiseNode: attribute allowlist, classes, ids ------------------------

describe('sanitiseNode — attributes an author could invent (rehype-attr)', () => {
  it('drops attributes outside the allowlist', () => {
    const node = element('a', {
      href: 'https://ok.test',
      target: '_top',
      name: 'currentUser',
      srcdoc: '<script>alert(1)</script>',
      ping: 'https://evil.test',
      download: 'x',
      'data-anything': 'x',
    })
    sanitiseNode(node)
    expect(node.properties).toEqual({ href: 'https://ok.test' })
  })

  it('keeps only pipeline classes, from both className and raw class', () => {
    const node = element('div', {
      className: ['fixed', 'inset-0', 'language-ts'],
      class: 'z-50 copied',
    })
    sanitiseNode(node)
    expect(node.properties?.className).toEqual(['language-ts', 'copied'])
    expect(node.properties).not.toHaveProperty('class')
  })

  it('removes className entirely when nothing survives', () => {
    const node = element('div', { className: 'fixed inset-0 z-50 bg-background' })
    sanitiseNode(node)
    expect(node.properties).not.toHaveProperty('className')
  })

  it('prefixes ids and in-page fragment links, idempotently', () => {
    const h = element('h2', { id: 'setup' })
    const a = element('a', { href: '#setup' })
    sanitiseNode(h)
    sanitiseNode(a)
    sanitiseNode(h)
    sanitiseNode(a)
    expect(h.properties?.id).toBe('user-content-setup')
    expect(a.properties?.href).toBe('#user-content-setup')
  })

  it('neutralises form controls and non-checkbox inputs', () => {
    for (const tag of ['button', 'textarea', 'select']) {
      const node = element(tag)
      sanitiseNode(node)
      expect(node.tagName).toBe('span')
    }
    const pw = element('input', { type: 'password', name: 'password' })
    sanitiseNode(pw)
    expect(pw.tagName).toBe('span')
  })

  it('keeps GFM task-list checkboxes, disabled', () => {
    const cb = element('input', { type: 'checkbox', checked: true })
    sanitiseNode(cb)
    expect(cb.tagName).toBe('input')
    expect(cb.properties).toEqual({ type: 'checkbox', checked: true, disabled: true })
  })
})
