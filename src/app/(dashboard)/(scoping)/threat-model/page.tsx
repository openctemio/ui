'use client'

import { useMemo, useState } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
import { Can, Permission } from '@/lib/permissions'
import { toast } from 'sonner'
import {
  CoverageStats,
  ExistingModels,
  MitreFooter,
  ScopePicker,
  ThreatModelTable,
  generateThreatModel,
  useAssetNameMap,
  useAttackerProfileMap,
  useCrownJewels,
  useThreatModel,
  useThreatModels,
} from '@/features/threat-model'
import type { ThreatFilters } from '@/features/threat-model'

const DEFAULT_FILTERS: ThreatFilters = {
  status: 'all',
  tactic: 'all',
  attacker: 'all',
  technique: 'all',
}

export default function ThreatModelPage() {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [filters, setFilters] = useState<ThreatFilters>(DEFAULT_FILTERS)

  const { models, isLoading: modelsLoading, mutate: mutateModels } = useThreatModels()
  const { crownJewels, isLoading: crownJewelsLoading } = useCrownJewels()
  const { model, isLoading: modelLoading } = useThreatModel(selectedModelId)
  const { profileMap } = useAttackerProfileMap()

  const assetIds = useMemo(() => {
    if (!model?.threats) return []
    const ids: string[] = []
    for (const t of model.threats) {
      ids.push(t.entry_point_asset_id, t.hop_asset_id, t.target_asset_id)
    }
    return ids
  }, [model])
  const { nameFor } = useAssetNameMap(assetIds)

  const handleGenerate = async (scopeRefId: string) => {
    setIsGenerating(true)
    try {
      const generated = await generateThreatModel('crown_jewel', scopeRefId)
      await mutateModels()
      setSelectedModelId(generated.id)
      setFilters(DEFAULT_FILTERS)
      toast.success('Threat model generated')
    } catch {
      toast.error('Failed to generate threat model')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRefresh = async () => {
    if (!model) return
    setIsGenerating(true)
    try {
      const generated = await generateThreatModel(model.scope_type, model.scope_ref_id)
      await mutateModels()
      setSelectedModelId(generated.id)
      toast.success('Threat model refreshed')
    } catch {
      toast.error('Failed to refresh threat model')
    } finally {
      setIsGenerating(false)
    }
  }

  const openModel = (id: string) => {
    setSelectedModelId(id)
    setFilters(DEFAULT_FILTERS)
  }

  // ----- Detail view -----
  if (selectedModelId) {
    return (
      <Main>
        <PageHeader
          title={model?.name ?? 'Threat model'}
          description={
            model
              ? `Generated ${formatDate(model.generated_at)} · ATT&CK ${model.technique_dataset_version}`
              : 'Loading threat model…'
          }
        >
          <Button variant="outline" size="sm" onClick={() => setSelectedModelId(null)}>
            <ArrowLeft className="me-2 h-4 w-4" />
            All models
          </Button>
          <Can
            permission={Permission.AssetsWrite}
            mode="disable"
            disabledTooltip="You need assets:write to refresh"
          >
            <Button size="sm" onClick={handleRefresh} disabled={isGenerating || !model}>
              {isGenerating ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="me-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </Can>
        </PageHeader>

        {modelLoading || !model ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <CoverageStats model={model} />
            <ThreatModelTable
              threats={model.threats ?? []}
              filters={filters}
              onFiltersChange={setFilters}
              profileMap={profileMap}
              nameFor={nameFor}
            />
            <MitreFooter />
          </div>
        )}
      </Main>
    )
  }

  // ----- Landing / list view -----
  return (
    <Main>
      <PageHeader
        title="Threat Model"
        description="Continuous threat modeling — derived attack techniques per crown jewel, mapped to MITRE ATT&CK and scored by coverage."
      />
      <div className="space-y-6">
        <ScopePicker
          crownJewels={crownJewels}
          isLoading={crownJewelsLoading}
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
        />
        {modelsLoading ? (
          <Card>
            <CardContent className="space-y-3 py-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        ) : (
          <ExistingModels models={models} selectedId={selectedModelId} onOpen={openModel} />
        )}
        <MitreFooter />
      </div>
    </Main>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}
