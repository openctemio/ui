'use client'

import { useState } from 'react'
import { Check, Tag as TagIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'
import { useAssetTags } from '../hooks/use-asset-tags'

interface TagFilterProps {
  value: string[]
  onChange: (next: string[]) => void
  /** Optional custom placeholder */
  placeholder?: string
  /** Optional asset types to scope tag suggestions */
  types?: string[]
}

/**
 * Multi-select tag filter using the /assets/tags autocomplete endpoint.
 *
 * - Server-side autocomplete via prefix query (debounced 200ms)
 * - Selecting a tag adds it to the list (deduped)
 * - Selected tags rendered as removable chips next to the trigger
 * - Backend matches with overlap semantics (tags && [...]) — i.e. asset must
 *   carry at least ONE of the selected tags. The trigger label reflects this.
 */
export function TagFilter({
  value,
  onChange,
  placeholder = 'Filter by tags',
  types,
}: TagFilterProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 200)

  // Only fetch tags while the popover is open to avoid an extra request on
  // every page mount. Pass the debounced query as prefix for autocomplete.
  const { tags, isLoading } = useAssetTags(debouncedQuery || undefined, open, types)

  // Soft cap on selected tags. Backend `parseQueryArray` enforces 100, but
  // anything past ~20 gets unwieldy in the UI and bloats the URL — warn the
  // user with a toast instead of silently truncating.
  const MAX_TAGS = 50

  const toggleTag = (tag: string) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag))
      return
    }
    if (value.length >= MAX_TAGS) {
      toast.warning(`Up to ${MAX_TAGS} tags can be applied at once`)
      return
    }
    onChange([...value, tag])
  }

  const clearAll = () => onChange([])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label="Filter by tags"
          className="h-9 gap-2"
        >
          <TagIcon className="h-3.5 w-3.5" />
          <span className="text-sm">
            {value.length > 0 ? `${value.length} tag${value.length === 1 ? '' : 's'}` : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search tags..." value={query} onValueChange={setQuery} />
          <CommandList>
            {isLoading && <div className="p-2 text-xs text-muted-foreground">Loading…</div>}
            {!isLoading && tags.length === 0 && <CommandEmpty>No tags found.</CommandEmpty>}
            {!isLoading && tags.length > 0 && (
              <CommandGroup>
                {tags.map((tag) => {
                  const selected = value.includes(tag)
                  return (
                    <CommandItem
                      key={tag}
                      value={tag}
                      onSelect={() => toggleTag(tag)}
                      className="flex items-center justify-between"
                    >
                      <span className="truncate">{tag}</span>
                      <Check
                        className={cn('h-4 w-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')}
                      />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Tag filter chips — rendered separately on row 2.
 */
export function TagFilterChips({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  if (value.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 text-xs">
          <span className="text-muted-foreground">tag:</span>
          <span className="truncate max-w-[160px] font-medium">{tag}</span>
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            aria-label={`Remove tag ${tag}`}
            className="hover:bg-muted rounded-sm"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {value.length > 1 && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          onClick={() => onChange([])}
        >
          Clear tags
        </button>
      )}
    </div>
  )
}
