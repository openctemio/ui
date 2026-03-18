'use client'

import * as React from 'react'
import { Plus, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface DynamicListInputProps {
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  numbered?: boolean
  maxItems?: number
  addLabel?: string
}

function DynamicListInput({
  items,
  onChange,
  placeholder,
  numbered = false,
  maxItems,
  addLabel = 'Add item',
}: DynamicListInputProps) {
  const inputRefs = React.useRef<Map<number, HTMLInputElement>>(new Map())
  const pendingFocusIndex = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (pendingFocusIndex.current !== null) {
      const idx = pendingFocusIndex.current
      pendingFocusIndex.current = null
      const el = inputRefs.current.get(idx)
      if (el) {
        el.focus()
      }
    }
  })

  function addItemAt(index: number) {
    if (maxItems && items.length >= maxItems) return
    const next = [...items]
    next.splice(index, 0, '')
    pendingFocusIndex.current = index
    onChange(next)
  }

  function removeItem(index: number) {
    const next = items.filter((_, i) => i !== index)
    const focusIdx = Math.max(0, index - 1)
    pendingFocusIndex.current = next.length > 0 ? focusIdx : null
    onChange(next)
  }

  function updateItem(index: number, value: string) {
    const next = [...items]
    next[index] = value
    onChange(next)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItemAt(index + 1)
    }
    if (e.key === 'Backspace' && items[index] === '' && items.length > 0) {
      e.preventDefault()
      removeItem(index)
    }
  }

  const canAdd = !maxItems || items.length < maxItems

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            'flex items-center gap-2',
            'animate-in fade-in-0 slide-in-from-top-1 duration-150'
          )}
        >
          {numbered && (
            <span className="text-sm text-muted-foreground w-6 text-right">{index + 1}.</span>
          )}
          <Input
            ref={(el) => {
              if (el) {
                inputRefs.current.set(index, el)
              } else {
                inputRefs.current.delete(index)
              }
            }}
            value={item}
            placeholder={placeholder}
            onChange={(e) => updateItem(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => removeItem(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {canAdd && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => addItemAt(items.length)}
        >
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      )}
    </div>
  )
}

export { DynamicListInput }
export type { DynamicListInputProps }
