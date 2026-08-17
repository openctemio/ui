import { Suspense } from 'react'
import { AllAssetsInventory } from '@/features/assets/components/inventory/all-assets-inventory'

/**
 * All-Assets inventory — one server-paginated, faceted table across every asset
 * type. The client component reads its filter state from the URL, so it is
 * wrapped in Suspense as required for useSearchParams under the app router.
 */
export default function AllAssetsPage() {
  return (
    <Suspense fallback={null}>
      <AllAssetsInventory />
    </Suspense>
  )
}
