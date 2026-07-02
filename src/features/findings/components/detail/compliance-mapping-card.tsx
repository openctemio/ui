'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { ClipboardCheck, Sparkles, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getErrorMessage } from '@/lib/api/error-handler'
import { usePermissions } from '@/context/permission-provider'
import { useFindingControls, useAutoMapFinding } from '@/features/compliance/api/use-compliance-api'

interface ComplianceMappingCardProps {
  findingId: string
}

/**
 * ComplianceMappingCard shows the compliance controls a finding is mapped to and
 * offers one-click deterministic auto-mapping to OWASP Top 10 controls (from the
 * finding's OWASP ids / CWEs). Pairs with api /controls/auto-map.
 */
export function ComplianceMappingCard({ findingId }: ComplianceMappingCardProps) {
  const { data, isLoading, mutate } = useFindingControls(findingId)
  const { trigger: autoMap, isMutating } = useAutoMapFinding(findingId)
  const { hasPermission } = usePermissions()

  const mappings = data?.data ?? []

  const handleAutoMap = useCallback(async () => {
    try {
      const res = await autoMap()
      const count = res?.count ?? 0
      if (count > 0) {
        toast.success(`Mapped to ${count} OWASP control${count === 1 ? '' : 's'}`)
      } else {
        toast.info('No new OWASP controls to map for this finding')
      }
      void mutate()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to auto-map finding'))
    }
  }, [autoMap, mutate])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="text-muted-foreground h-4 w-4" />
              Compliance Controls
            </CardTitle>
            <CardDescription>Controls this finding is mapped to.</CardDescription>
          </div>
          {hasPermission('compliance:mappings:write') && (
            <Button size="sm" variant="outline" onClick={handleAutoMap} disabled={isMutating}>
              {isMutating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              )}
              Auto-map to OWASP
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading control mappings…</p>
        ) : mappings.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Not mapped to any control yet. Use Auto-map to derive OWASP Top 10 controls from this
            finding&apos;s CWE / OWASP classification.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {mappings.map((m) => (
              <Badge key={m.id} variant="secondary" className="font-normal">
                {m.impact}
              </Badge>
            ))}
            <span className="text-muted-foreground text-xs">
              {mappings.length} control{mappings.length === 1 ? '' : 's'} mapped
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
