'use client'

import { useState, useCallback } from 'react'
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

  const filteredSuggestions = suggestions
    .filter((s) => !value.includes(s))
    .filter((s) => !input || s.toLowerCase().includes(input.toLowerCase()))
    .slice(0, 6)

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
              />
              {filteredSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground mr-1 py-0.5">Suggestions:</span>
                  {filteredSuggestions.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30 text-xs transition-colors"
                      onClick={() => handleAdd(tag)}
                    >
                      + {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
