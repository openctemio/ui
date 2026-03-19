'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface SelectOption {
  value: string
  label: string
}

interface CreatableSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  onCreateOption?: (option: SelectOption) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function CreatableSelect({
  options,
  value,
  onChange,
  onCreateOption,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  className,
  disabled,
}: CreatableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const selectedLabel = options.find((o) => o.value === value)?.label || value

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.value.toLowerCase().includes(search.toLowerCase())
  )

  const exactMatch = options.some(
    (o) =>
      o.label.toLowerCase() === search.toLowerCase() ||
      o.value.toLowerCase() === search.toLowerCase()
  )

  const canCreate = search.trim().length > 0 && !exactMatch && onCreateOption

  const handleCreate = () => {
    const newValue = search
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
    const newLabel = search.trim()
    const option = { value: newValue, label: newLabel }
    onCreateOption?.(option)
    onChange(newValue)
    setSearch('')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{value ? selectedLabel : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 pointer-events-auto"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>
              {canCreate ? (
                <button
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm"
                  onClick={handleCreate}
                >
                  <Plus className="h-4 w-4" />
                  Create &quot;{search.trim()}&quot;
                </button>
              ) : (
                'No results found.'
              )}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(option.value)
                    setSearch('')
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {canCreate && filtered.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create &quot;{search.trim()}&quot;
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
