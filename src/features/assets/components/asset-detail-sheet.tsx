/**
 * Asset Detail Sheet
 *
 * Reusable sheet component for viewing asset details
 * Supports customization via render props for type-specific content
 */

'use client'

import * as React from 'react'
import { Pencil, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/clipboard'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { cn } from '@/lib/utils'
import { SheetDetailToolbar } from '@/features/shared'
import { AssetStatusBadge, LifecycleSnoozeMenu } from '@/features/asset-lifecycle'
import { AssetFindings } from './asset-findings'
import {
  TimelineSection,
  TechnicalDetailsSection,
  DangerZoneSection,
  TagsSection,
} from './sheet-sections'
import { AssetMergeHistory } from './asset-merge-history'
import { RelationshipPreview } from './relationships'
import { AssetRelationshipsTab } from './asset-relationships-tab'
import { ClassificationBadges } from './classification-badges'
import { useAssetRelationships } from '../hooks'
import type { Asset } from '../types/asset.types'

// ============================================
// Types
// ============================================

interface AssetDetailSheetProps<T extends Asset> {
  /** The asset to display (null when sheet is closed) */
  asset: T | null

  /** Whether the sheet is open */
  open: boolean

  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void

  /** Icon component to display in header */
  icon: React.ElementType

  /** Icon color class (e.g., "text-blue-500") */
  iconColor: string

  /** Gradient start color class (e.g., "from-blue-500/20") */
  gradientFrom: string

  /** Gradient via color class (optional, e.g., "via-blue-500/10") */
  gradientVia?: string

  /** Callback when Edit button is clicked */
  onEdit: () => void

  /** Callback when Delete is clicked from danger zone */
  onDelete: () => void

  /** Whether user can edit the asset (for permission gating, default: true) */
  canEdit?: boolean

  /** Whether user can delete the asset (for permission gating, default: true) */
  canDelete?: boolean

  /** Additional quick action buttons (rendered after Edit button) */
  quickActions?: React.ReactNode

  /** Custom stats section content */
  statsContent?: React.ReactNode

  /** Custom overview section content (rendered after stats) */
  overviewContent?: React.ReactNode

  /** Optional subtitle (shown below name, defaults to groupName) */
  subtitle?: string

  /** Asset type label for display (e.g., "Domain", "Website") */
  assetTypeName: string

  /** Whether to show the Details tab (default: true) */
  showDetailsTab?: boolean

  /** Whether to show the Findings tab (default: true) */
  showFindingsTab?: boolean

  /** Custom tabs to insert between Overview and Findings */
  extraTabs?: Array<{
    value: string
    label: string
    content: React.ReactNode
  }>

  // ============================================
  // Relationship Props
  // ============================================
  //
  // Add / Edit / Delete are handled internally by AssetRelationshipsTab now,
  // so consumers no longer need to wire callbacks. The only callback that
  // *must* be wired by the parent is `onNavigateToAsset` — the sheet has no
  // way to swap its own selectedAsset on its own, so navigation between
  // related assets has to be lifted up to whatever owns this sheet.

  /** Whether to show relationship preview in overview tab (default: true if relationships exist) */
  showRelationshipPreview?: boolean

  /**
   * Called when the user clicks a related asset in the relationships
   * tab or the overview preview. Should swap the parent's selectedAsset
   * to the new asset. If omitted, related-asset clicks are no-ops.
   */
  onNavigateToAsset?: (assetId: string) => void

  /** Callback when tags are updated inline */
  onUpdateTags?: (tags: string[]) => Promise<void>

  /** Available tag suggestions for autocomplete */
  tagSuggestions?: string[]
}

// ============================================
// Helpers
// ============================================

// daysSinceLastSeen returns the whole-days difference between now and the
// asset's last-seen timestamp. Returns undefined when the timestamp is
// missing or unparseable so the badge renders its plain form rather than
// an inaccurate "stale 0d" label.
function daysSinceLastSeen(iso?: string | null): number | undefined {
  if (!iso) return undefined
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return undefined
  const diffMs = Date.now() - t
  if (diffMs < 0) return undefined
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

// ============================================
// Component
// ============================================

export function AssetDetailSheet<T extends Asset>({
  asset,
  open,
  onOpenChange,
  icon: Icon,
  iconColor,
  gradientFrom,
  gradientVia = 'via-transparent',
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
  quickActions,
  statsContent,
  overviewContent,
  subtitle,
  assetTypeName,
  showDetailsTab = true,
  showFindingsTab = true,
  extraTabs,
  // Relationship props
  showRelationshipPreview,
  onNavigateToAsset,
  onUpdateTags,
  tagSuggestions,
}: AssetDetailSheetProps<T>) {
  const [activeTab, setActiveTab] = React.useState('overview')

  // Fetch relationships only for the overview-tab preview + the tab badge
  // count. The relationships *tab* itself fetches its own copy via
  // AssetRelationshipsTab — that copy is the source of truth for the CRUD
  // dialogs. Both calls share the same SWR cache key so there is only one
  // network request in practice.
  const { relationships } = useAssetRelationships(asset?.id ?? null)

  if (!asset) return null

  // Calculate icon background color from text color
  const iconBgColor = iconColor.replace('text-', 'bg-').replace(/(\d+)$/, '$1/20')

  // Determine if we should show relationships
  const hasRelationships = relationships.length > 0
  const shouldShowRelationshipTab = true
  const shouldShowRelationshipPreview = showRelationshipPreview ?? hasRelationships

  // Calculate total number of tabs
  const tabCount =
    1 +
    (showFindingsTab ? 1 : 0) +
    (showDetailsTab ? 1 : 0) +
    (extraTabs?.length || 0) +
    (shouldShowRelationshipTab ? 1 : 0)
  // Mobile: horizontally scrollable flex strip — every tab keeps its
  // natural width (text + badge fit without colliding) and the user
  // swipes left/right to reveal more. Previously the tabs used a
  // grid-cols-N layout that crammed 5 columns into a ~360px viewport,
  // making labels overlap (Owner|Relations|Findings ran together).
  //
  // Tablet+: switch back to a fixed grid where every tab is the same
  // width — looks balanced when there's actual horizontal room.
  const tabGridClass =
    tabCount === 2
      ? 'sm:grid-cols-2'
      : tabCount === 3
        ? 'sm:grid-cols-3'
        : tabCount === 4
          ? 'sm:grid-cols-4'
          : tabCount === 5
            ? 'sm:grid-cols-5'
            : 'sm:grid-cols-3'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* The shell is a flex column with no own scroll. The header and the
          tab strip are shrink-0 (pinned), and only the active TabsContent
          scrolls. This replaces the previous "scroll the whole sheet"
          behaviour where the header + tabs scrolled out of view together
          with the body content. */}
      <SheetContent
        className="sm:max-w-xl flex flex-col p-0 overflow-hidden [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <SheetTitle>{assetTypeName} Details</SheetTitle>
          <SheetDescription>
            {assetTypeName} detail panel for {asset.name}. Use the tabs to view stats, findings,
            owners, relationships and metadata.
          </SheetDescription>
        </VisuallyHidden>

        {/* Header — pinned at the top */}
        <TooltipProvider>
          <div
            className={cn('bg-gradient-to-br to-transparent shrink-0', gradientFrom, gradientVia)}
          >
            {/* Toolbar: title left, actions right */}
            <SheetDetailToolbar
              title={`${assetTypeName} Details`}
              onClose={() => onOpenChange(false)}
              onEdit={canEdit ? onEdit : undefined}
              onCopyId={() => {
                copyToClipboard(asset.id)
                toast.success('Asset ID copied')
              }}
            />

            <div className="px-6 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={cn(
                    'h-12 w-12 rounded-xl flex items-center justify-center',
                    iconBgColor
                  )}
                >
                  <Icon className={cn('h-6 w-6', iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold break-words" title={asset.name}>
                    {asset.name}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">
                    {subtitle || asset.groupName}
                  </p>
                </div>
                <AssetStatusBadge
                  status={asset.status}
                  daysSinceLastSeen={daysSinceLastSeen(asset.lastSeen)}
                />
              </div>

              {/* Classification Badges */}
              <div className="flex items-center gap-2 mb-2">
                <ClassificationBadges
                  scope={asset.scope}
                  exposure={asset.exposure}
                  criticality={asset.criticality}
                  size="md"
                  showTooltips
                />
              </div>

              {/* Quick Actions (secondary buttons below header).
                  Lifecycle snooze shows on every asset so operators
                  can proactively pause the worker during known
                  offline windows (rack migrations, planned
                  maintenance) — not only after the asset has been
                  flagged stale. The reactivate-on-snooze auto-flag
                  inside the menu only fires when status warrants it. */}
              <div className="flex flex-wrap gap-2 mt-4">
                {quickActions}
                <LifecycleSnoozeMenu
                  assetID={asset.id}
                  isStaleOrInactive={asset.status === 'stale' || asset.status === 'inactive'}
                />
              </div>
            </div>
          </div>
        </TooltipProvider>

        {/* Tabs — flex-1 + min-h-0 lets the Tabs region take all the
            remaining vertical space below the header. The TabsList is
            pinned (shrink-0), and each TabsContent grows + scrolls
            independently. min-h-0 is critical: without it, flex-1 inside
            a flex column will refuse to shrink below its content height,
            and you get the original "scroll the whole sheet" behaviour. */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col flex-1 min-h-0 px-6 pb-6"
        >
          {/* Mobile: flex with horizontal scroll. The TabsList itself is
              wrapped so the scroll-shadow can sit just inside the sheet
              edges. whitespace-nowrap on each trigger keeps multi-word
              labels from wrapping. sm: switches back to a fixed grid. */}
          <div className="-mx-6 px-6 mb-4 shrink-0 overflow-x-auto no-scrollbar sm:mx-0 sm:px-0">
            <TabsList
              className={cn('inline-flex w-max gap-1 sm:grid sm:w-full sm:gap-0', tabGridClass)}
            >
              <TabsTrigger value="overview" className="whitespace-nowrap">
                Overview
              </TabsTrigger>
              {extraTabs?.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="whitespace-nowrap">
                  {tab.label}
                </TabsTrigger>
              ))}
              {shouldShowRelationshipTab && (
                <TabsTrigger value="relationships" className="gap-1 whitespace-nowrap">
                  <Link2 className="h-3.5 w-3.5" />
                  Relations
                  {relationships.length > 0 && (
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                      {relationships.length}
                    </span>
                  )}
                </TabsTrigger>
              )}
              {showFindingsTab && (
                <TabsTrigger value="findings" className="gap-1 whitespace-nowrap">
                  Findings
                  {asset.findingCount > 0 && (
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                      {asset.findingCount}
                    </span>
                  )}
                </TabsTrigger>
              )}
              {showDetailsTab && (
                <TabsTrigger value="details" className="whitespace-nowrap">
                  Details
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Overview Tab — flex-1 + min-h-0 + overflow-y-auto so this
              tab body scrolls inside the sheet shell instead of growing
              the whole sheet. Each TabsContent below applies the same
              pattern. */}
          <TabsContent
            value="overview"
            className="space-y-4 mt-0 flex-1 min-h-0 overflow-y-auto pr-1"
          >
            {statsContent}

            {/* Description + Owner Reference — top-level Asset fields that
                are NOT part of per-type metadata. The form lets users edit
                these but the previous version of the sheet never displayed
                them, so the workflow was broken (edit → can't verify). */}
            {(asset.description || asset.ownerRef) && (
              <div className="rounded-xl border bg-card p-4 space-y-3">
                {asset.description && (
                  <div>
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap">{asset.description}</p>
                  </div>
                )}
                {asset.ownerRef && (
                  <div>
                    <p className="text-xs text-muted-foreground">Owner Reference</p>
                    <p className="text-sm mt-0.5 font-medium">{asset.ownerRef}</p>
                  </div>
                )}
              </div>
            )}

            {overviewContent}

            {/* Relationship Preview in Overview */}
            {shouldShowRelationshipPreview && (
              <RelationshipPreview
                relationships={relationships}
                currentAssetId={asset.id}
                onViewAll={() => setActiveTab('relationships')}
                onAssetClick={onNavigateToAsset}
                maxItems={3}
              />
            )}

            <TagsSection tags={asset.tags} suggestions={tagSuggestions} onSave={onUpdateTags} />
          </TabsContent>

          {/* Extra Tabs — same flex-1 + scroll pattern as Overview */}
          {extraTabs?.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="mt-0 flex-1 min-h-0 overflow-y-auto pr-1"
            >
              {tab.content}
            </TabsContent>
          ))}

          {/* Relationships Tab — self-contained container handles Add /
              Edit / Delete dialogs internally. The only callback we
              forward is onNavigateToAsset because the sheet itself
              cannot swap its own selectedAsset. */}
          {shouldShowRelationshipTab && (
            <TabsContent value="relationships" className="mt-0 flex-1 min-h-0 overflow-y-auto pr-1">
              <AssetRelationshipsTab
                assetId={asset.id}
                sourceAsset={{ id: asset.id, name: asset.name, type: asset.type }}
                onNavigateToAsset={onNavigateToAsset}
              />
            </TabsContent>
          )}

          {/* Findings Tab */}
          {showFindingsTab && (
            <TabsContent value="findings" className="mt-0 flex-1 min-h-0 overflow-y-auto pr-1">
              <AssetFindings assetId={asset.id} assetName={asset.name} />
            </TabsContent>
          )}

          {/* Details Tab */}
          {showDetailsTab && (
            <TabsContent
              value="details"
              className="space-y-4 mt-0 flex-1 min-h-0 overflow-y-auto pr-1"
            >
              <TimelineSection
                firstSeen={asset.firstSeen}
                lastSeen={asset.lastSeen}
                createdAt={asset.createdAt}
                updatedAt={asset.updatedAt}
              />
              <TechnicalDetailsSection id={asset.id} type={asset.type} groupId={asset.groupId} />
              <AssetMergeHistory assetId={asset.id} />
              {canDelete && <DangerZoneSection onDelete={onDelete} assetTypeName={assetTypeName} />}
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
