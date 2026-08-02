'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import { sanitiseNode } from '@/lib/sanitize-markdown'
import { useTheme } from 'next-themes'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
  preview?: 'edit' | 'live' | 'preview'
  className?: string
  hideToolbar?: boolean
  /**
   * Render a small "Write / Preview" segmented control above the editor so the
   * author can flip between typing markdown and seeing the sanitised, rendered
   * result. Preview goes through the same `sanitiseNode` rewrite as everywhere
   * else. Preferred over `preview='live'` in narrow (1fr) form columns where a
   * side-by-side split is cramped.
   */
  showPreviewToggle?: boolean
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write your content here...',
  height = 200,
  preview = 'edit',
  className,
  hideToolbar = false,
  showPreviewToggle = false,
}: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme()
  const [mode, setMode] = React.useState<'write' | 'preview'>('write')

  return (
    <div className={cn('w-full', className)} data-color-mode={resolvedTheme}>
      {showPreviewToggle && (
        <div className="mb-1.5 inline-flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5 text-xs">
          {(['write', 'preview'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={cn(
                'rounded px-2.5 py-1 font-medium capitalize transition-colors',
                mode === m
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {showPreviewToggle && mode === 'preview' ? (
        <div
          className="overflow-y-auto rounded-md border bg-background px-3 py-2"
          style={{ minHeight: height }}
        >
          {value.trim() ? (
            <MarkdownPreview content={value} />
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <MDEditor
          value={value}
          onChange={(val) => onChange(val || '')}
          preview={showPreviewToggle ? 'edit' : preview}
          height={height}
          textareaProps={{
            placeholder,
          }}
          // Sanitise the editor's own live/preview pane too — without this,
          // rehypeRewrite only runs in the standalone MarkdownPreview and the
          // editor preview ('live'/'preview' modes) would render raw HTML.
          previewOptions={{ rehypeRewrite: sanitiseNode }}
          hideToolbar={hideToolbar}
          visibleDragbar={false}
        />
      )}
    </div>
  )
}

// Dynamic import OUTSIDE component to prevent re-creation on every render
const MDPreview = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
  { ssr: false }
)

// Preview only component
interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  const { resolvedTheme } = useTheme()

  return (
    <div
      className={cn('prose prose-sm dark:prose-invert max-w-none', className)}
      data-color-mode={resolvedTheme}
    >
      {/* rehypeRewrite sanitises every element before render. See
          @/lib/sanitize-markdown for the blocklist rationale. */}
      <MDPreview source={content} rehypeRewrite={sanitiseNode} />
    </div>
  )
}
