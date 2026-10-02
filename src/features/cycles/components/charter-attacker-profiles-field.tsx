'use client'

import { useMemo } from 'react'
import { Lock } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { profileTypeLabel, useAttackerProfiles, type AttackerProfile } from '../api'

/**
 * Picks the attacker profiles a cycle assumes (external unauthenticated,
 * stolen credentials, insider, supplier...). The cycle links existing profiles
 * (`ctem_cycle_attacker_profiles`), the same objects the threat model reasons
 * over, instead of free-text "threat scenarios" nothing else reads.
 */
export function CharterAttackerProfilesField({
  value,
  onChange,
  editable,
  idPrefix = 'cycle-profile',
}: {
  value: string[]
  onChange: (next: string[]) => void
  editable: boolean
  idPrefix?: string
}) {
  const { data, error, isLoading } = useAttackerProfiles()
  const profiles = useMemo(() => data?.data ?? [], [data])
  const selected = useMemo(() => new Set(value), [value])

  if (isLoading) return <Skeleton className="h-24 w-full" />
  if (error) {
    return (
      <p className="text-sm text-muted-foreground">
        Attacker profiles could not be loaded (the Attacker profiles module may be off).
      </p>
    )
  }

  if (!editable) {
    const chosen = profiles.filter((p) => selected.has(p.id))
    return chosen.length === 0 ? (
      <p className="text-sm text-muted-foreground">None chosen</p>
    ) : (
      <ul className="space-y-1 text-sm">
        {chosen.map((p) => (
          <li key={p.id}>
            <span className="font-medium">{p.name}</span>
            <span className="text-muted-foreground"> · {profileTypeLabel(p.profile_type)}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (profiles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No attacker profiles yet. Create them under Scoping › Threat model › Attacker profiles.
      </p>
    )
  }

  const toggle = (p: AttackerProfile, checked: boolean) =>
    onChange(checked ? [...value, p.id] : value.filter((v) => v !== p.id))

  return (
    <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
      {profiles.map((p) => {
        const id = `${idPrefix}-${p.id}`
        return (
          <div key={p.id} className="flex items-start gap-2 rounded px-1 py-1.5 hover:bg-muted/50">
            <Checkbox
              id={id}
              className="mt-0.5"
              checked={selected.has(p.id)}
              onCheckedChange={(c) => toggle(p, c === true)}
            />
            <Label htmlFor={id} className="flex-1 cursor-pointer flex-col items-start gap-0.5">
              <span className="flex items-center gap-1.5 font-medium">
                {p.name}
                {p.is_default && (
                  <Lock className="h-3 w-3 text-muted-foreground" aria-label="Built-in profile" />
                )}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {profileTypeLabel(p.profile_type)}
                {p.description ? ` · ${p.description}` : ''}
              </span>
            </Label>
          </div>
        )
      })}
    </div>
  )
}
