'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
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
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write your content here...',
  height = 200,
  preview = 'edit',
  className,
  hideToolbar = false,
}: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme()

  return (
    <div className={cn('w-full', className)} data-color-mode={resolvedTheme}>
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || '')}
        preview={preview}
        height={height}
        textareaProps={{
          placeholder,
        }}
        hideToolbar={hideToolbar}
        visibleDragbar={false}
      />
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
      <MDPreview source={content} />
    </div>
  )
}
