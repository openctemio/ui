'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { AssetPage } from '@/features/assets/components/asset-page'
import { domainsConfig } from './config'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const TYPE_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Root', value: 'domain' },
  { label: 'Sub', value: 'subdomain' },
] as const

export default function DomainsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const currentType = searchParams.get('type') ?? ''

  const setTypeFilter = (type: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (type) {
      params.set('type', type)
    } else {
      params.delete('type')
    }
    // Reset pagination when changing type filter
    params.delete('page')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  // No remount key based on type — switching Root/Sub should preserve filters.
  // AssetPage reacts to ?type= via urlType and re-fetches automatically.
  return (
    <AssetPage
      config={domainsConfig}
      headerExtra={
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          {TYPE_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 px-3 text-xs rounded-md',
                currentType === f.value && 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      }
    />
  )
}
