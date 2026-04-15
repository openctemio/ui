'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { get } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { ListFilter, X, Check } from 'lucide-react'
import type { AssetType } from '../types'

interface PropertyFacet {
  Key: string
  Label: string
  Values: string[]
  Count: number
}

interface PropertyFilterProps {
  types: AssetType[]
  subType?: string
  value: Record<string, string[]>
  onChange: (value: Record<string, string[]>) => void
  /** Filtered count (current result) */
  filtered?: number
  /** Total count (without properties filter) */
  total?: number
}

/**
 * Dynamic property filter — fetches available fields + values from the API,
 * lets users pick any property key/value combination.
 */
export function PropertyFilter({
  types,
  subType,
  value,
  onChange,
  filtered,
  total,
}: PropertyFilterProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'key' | 'value'>('key')
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [selectedFacet, setSelectedFacet] = useState<PropertyFacet | null>(null)

  // Fetch facets from API
  const params = new URLSearchParams()
  if (types.length > 0) params.set('types', types.join(','))
  if (subType) params.set('sub_type', subType)
  const qs = params.toString()

  const { data: facets } = useSWR<PropertyFacet[]>(
    `asset-facets-${qs}`,
    () => get<PropertyFacet[]>(`${endpoints.assets.facets()}${qs ? `?${qs}` : ''}`),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  // All facets are available (user can add more values to existing keys)
  const availableFacets = useMemo(() => facets ?? [], [facets])

  const activeFilters = Object.entries(value)
  const facetLabelMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const f of facets ?? []) map[f.Key] = f.Label
    return map
  }, [facets])

  const handleSelectKey = (facet: PropertyFacet) => {
    setSelectedKey(facet.Key)
    setSelectedFacet(facet)
    setStep('value')
  }

  const handleSelectValue = (val: string) => {
    const existing = value[selectedKey] ?? []
    if (!existing.includes(val)) {
      onChange({ ...value, [selectedKey]: [...existing, val] })
    }
    // Stay open for adding more values or keys
    setStep('key')
    setSelectedKey('')
    setSelectedFacet(null)
  }

  const handleRemove = (key: string) => {
    const next = { ...value }
    delete next[key]
    onChange(next)
  }

  const handleClearAll = () => onChange({})

  return (
    <>
      {/* Add filter button — inline in the controls row */}
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) {
            setStep('key')
            setSelectedKey('')
            setSelectedFacet(null)
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <ListFilter className="h-3.5 w-3.5" />
            Add Filter
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          {step === 'key' ? (
            <Command>
              <CommandInput placeholder="Search fields..." />
              <CommandList>
                <CommandEmpty>No fields found</CommandEmpty>
                <CommandGroup heading="Properties">
                  {availableFacets.map((facet) => (
                    <CommandItem
                      key={facet.Key}
                      onSelect={() => handleSelectKey(facet)}
                      className="flex items-center justify-between"
                    >
                      <span>{facet.Label}</span>
                      <span className="text-xs text-muted-foreground">{facet.Count}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          ) : (
            <Command>
              <CommandInput placeholder={`Search ${selectedFacet?.Label ?? ''}...`} />
              <CommandList>
                <CommandEmpty>No values found</CommandEmpty>
                <CommandGroup heading={selectedFacet?.Label ?? selectedKey}>
                  <CommandItem
                    value="__back__"
                    onSelect={() => setStep('key')}
                    className="text-muted-foreground"
                  >
                    &larr; Back to fields
                  </CommandItem>
                  {(selectedFacet?.Values ?? []).map((val) => (
                    <CommandItem
                      key={val}
                      onSelect={() => handleSelectValue(val)}
                      className="flex items-center justify-between"
                    >
                      <span>{val}</span>
                      {value[selectedKey]?.includes(val) && <Check className="h-3 w-3" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </PopoverContent>
      </Popover>
    </>
  )
}

/**
 * Active filter chips — rendered separately so they can be placed on their own row.
 * Each value gets its own chip for easy removal.
 */
export function PropertyFilterChips({
  value,
  onChange,
  facetLabels,
  filtered,
  total,
}: {
  value: Record<string, string[]>
  onChange: (value: Record<string, string[]>) => void
  facetLabels?: Record<string, string>
  filtered?: number
  total?: number
}) {
  const activeFilters = Object.entries(value)
  if (activeFilters.length === 0) return null

  const totalChips = activeFilters.reduce((sum, [, vals]) => sum + vals.length, 0)

  const handleRemoveValue = (key: string, val: string) => {
    const existing = value[key] ?? []
    const updated = existing.filter((v) => v !== val)
    if (updated.length === 0) {
      const next = { ...value }
      delete next[key]
      onChange(next)
    } else {
      onChange({ ...value, [key]: updated })
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {activeFilters.flatMap(([key, vals]) =>
        vals.map((val) => (
          <Badge key={`${key}:${val}`} variant="secondary" className="gap-1 text-xs h-7 pl-2 pr-1">
            <span className="text-muted-foreground">{facetLabels?.[key] || key}:</span>
            <span className="font-medium truncate max-w-[150px]">{val}</span>
            <button
              type="button"
              className="ml-0.5 rounded-sm hover:bg-destructive/20 p-0.5"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleRemoveValue(key, val)
              }}
            >
              <X className="h-3 w-3 hover:text-destructive" />
            </button>
          </Badge>
        ))
      )}

      {filtered !== undefined && total !== undefined && total > 0 && (
        <span className="text-xs text-muted-foreground">
          {filtered.toLocaleString()} / {total.toLocaleString()}
        </span>
      )}

      {totalChips > 1 && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          onClick={() => onChange({})}
        >
          Clear all
        </button>
      )}
    </div>
  )
}
