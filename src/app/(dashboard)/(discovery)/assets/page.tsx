'use client'

import { Suspense } from 'react'
import { LayoutGrid, List } from 'lucide-react'
import { ViewSwitcher, type ViewOption } from '@/features/shared'
import { AllAssetsInventory } from '@/features/assets/components/inventory/all-assets-inventory'
import { AssetCategoriesView } from '@/features/assets/components/overview/asset-categories-view'
import { useUrlFilter } from '@/hooks/use-url-param'

type AssetsView = 'list' | 'categories'

const VIEWS: ReadonlyArray<ViewOption<AssetsView>> = [
  { value: 'list', label: 'List view', icon: List },
  { value: 'categories', label: 'Category view', icon: LayoutGrid },
]

/**
 * Assets opens on the full, filterable list of every asset; the category
 * cards are the same inventory viewed by type. The view is kept in the URL
 * (?view=categories), so it survives reloads and can be linked.
 */
function AssetsPageContent() {
  const [view, setView] = useUrlFilter('view', 'list')
  const current: AssetsView = view === 'categories' ? 'categories' : 'list'
  const switcher = <ViewSwitcher options={VIEWS} value={current} onChange={setView} />
  return current === 'categories' ? (
    <AssetCategoriesView viewSwitcher={switcher} />
  ) : (
    <AllAssetsInventory viewSwitcher={switcher} />
  )
}

export default function AssetsPage() {
  // useSearchParams (URL state) needs a Suspense boundary under the app router.
  return (
    <Suspense fallback={null}>
      <AssetsPageContent />
    </Suspense>
  )
}
