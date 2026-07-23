'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/features/shared'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Can, Permission } from '@/lib/permissions'
import { Crown, Loader2, Sparkles } from 'lucide-react'
import type { CrownJewelAsset } from '../hooks/use-threat-model-refs'

interface ScopePickerProps {
  crownJewels: CrownJewelAsset[]
  isLoading: boolean
  isGenerating: boolean
  onGenerate: (assetId: string) => void
}

/**
 * Choose a crown-jewel asset scope and generate/refresh its threat model.
 * The generate action is AssetsWrite-gated; if no crown jewels exist we point
 * the user at designating one first (you cannot model what isn't in scope).
 */
export function ScopePicker({
  crownJewels,
  isLoading,
  isGenerating,
  onGenerate,
}: ScopePickerProps) {
  const [selected, setSelected] = useState<string>('')

  if (!isLoading && crownJewels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generate a threat model</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Crown}
            title="No crown jewels in scope"
            description="Threat models are generated per crown jewel. Designate a critical asset as a crown jewel, then return here to generate its model."
            action={
              <Button variant="outline" asChild>
                <a href="/crown-jewels">Manage crown jewels</a>
              </Button>
            }
            card={false}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate a threat model</CardTitle>
        <CardDescription>
          Pick a crown-jewel asset to build (or refresh) its derived threat model from attacker
          profiles and attack paths.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium" htmlFor="crown-jewel-scope">
              Crown-jewel scope
            </label>
            <Select value={selected} onValueChange={setSelected} disabled={isLoading}>
              <SelectTrigger id="crown-jewel-scope" className="w-full">
                <SelectValue
                  placeholder={isLoading ? 'Loading crown jewels…' : 'Select an asset'}
                />
              </SelectTrigger>
              <SelectContent>
                {crownJewels.map((cj) => (
                  <SelectItem key={cj.id} value={cj.id}>
                    <span className="flex items-center gap-2">
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                      {cj.name}
                      {cj.criticality && (
                        <span className="text-muted-foreground text-xs capitalize">
                          ({cj.criticality})
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Can
            permission={Permission.AssetsWrite}
            mode="disable"
            disabledTooltip="You need assets:write to generate a threat model"
          >
            <Button
              onClick={() => selected && onGenerate(selected)}
              disabled={!selected || isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="me-2 h-4 w-4" />
              )}
              {isGenerating ? 'Generating…' : 'Generate / Refresh'}
            </Button>
          </Can>
        </div>
      </CardContent>
    </Card>
  )
}
