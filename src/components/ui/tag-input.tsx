'use client'

import { useState, useCallback, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  maxTags?: number
  disabled?: boolean
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Type a tag and press Enter...',
  maxTags = 20,
  disabled = false,
}: TagInputProps) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleAdd = useCallback(
    (tag: string) => {
      const normalized = tag
        .trim()
        .toLowerCase()
        .replace(/[<>"'&]/g, '') // Strip HTML-sensitive chars
        .slice(0, 50) // Max 50 chars per tag (matches backend validation)
      if (normalized && !value.includes(normalized) && value.length < maxTags) {
        onChange([...value, normalized])
      }
      setInput('')
    },
    [value, onChange, maxTags]
  )

  const handleRemove = useCallback(
    (tagToRemove: string) => {
      onChange(value.filter((t) => t !== tagToRemove))
    },
    [value, onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        handleAdd(input)
      }
      if (e.key === 'Backspace' && !input && value.length > 0) {
        handleRemove(value[value.length - 1])
      }
    },
    [input, handleAdd, handleRemove, value]
  )

  const handleFocus = useCallback(() => {
    clearTimeout(blurTimeoutRef.current)
    setFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    // Delay blur so clicking a suggestion doesn't close the list
    blurTimeoutRef.current = setTimeout(() => setFocused(false), 150)
  }, [])

  const filteredSuggestions = suggestions
    .filter((s) => !value.includes(s))
    .filter((s) => !input || s.toLowerCase().includes(input.toLowerCase()))
    .slice(0, 6)

  // Show the suggestions UI whenever the input is focused, even if the
  // filtered list is empty. The previous version only showed the panel
  // when there was at least one suggestion to render — which made the
  // feature invisible to users in two common cases:
  //   1. The asset has all of the tenant's existing tags already added
  //   2. The user's typed query doesn't match any suggestion
  // In both cases the user couldn't tell if autocomplete even existed.
  // Showing the panel + an empty-state message makes the affordance
  // discoverable.
  const showSuggestions = focused && !disabled && suggestions.length > 0

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-lg">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pl-2 pr-1">
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(tag)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
      {!disabled && (
        <>
          {value.length >= maxTags ? (
            <p className="text-xs text-muted-foreground">Maximum {maxTags} tags reached</p>
          ) : (
            <>
              <Input
                placeholder={placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
              {showSuggestions && (
                <div className="flex flex-wrap gap-1" role="listbox" aria-label="Tag suggestions">
                  <span className="text-xs text-muted-foreground mr-1 py-0.5">Suggestions:</span>
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        role="option"
                        className="cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30 text-xs transition-colors"
                        // onMouseDown fires before onBlur, so the tag is
                        // added before the suggestion list closes. Using
                        // onClick alone races with the blur timeout.
                        onMouseDown={(e) => {
                          e.preventDefault()
                          handleAdd(tag)
                        }}
                      >
                        + {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      {input
                        ? `No existing tag matches "${input}". Press Enter to create.`
                        : 'All existing tags are already applied. Type to create a new one.'}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
