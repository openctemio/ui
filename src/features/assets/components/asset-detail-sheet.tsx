/**
 * Asset Detail Sheet
 *
 * Reusable sheet component for viewing asset details
 * Supports customization via render props for type-specific content
 */

'use client'

import * as React from 'react'
import { FileText } from 'lucide-react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/clipboard'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
  SheetDetailToolbar,
  DetailSheetHeader,
  DetailSections,
  DetailSection,
} from '@/features/shared'
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
import { AssetOwnersTab } from './asset-owners-tab'
import {
  RiskSummarySection,
  OwnershipSection,
  ExposureSection,
  DiscoverySection,
  PropertiesSection,
} from './asset-overview-sections'
import { getAssetTypeIcon, getAssetTypeLabel } from '../lib/asset-type-icon'
import { ClassificationBadges, CIABadges, ControlPlaneBadge } from './classification-badges'
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

  /** Header icon. Defaults to the asset type's icon. */
  icon?: React.ElementType

  /**
   * @deprecated Ignored. The header icon sits in a neutral tile; per-type
   * colours are gone (they rendered a solid white tile in dark mode).
   */
  iconColor?: string

  /** @deprecated Ignored. The sheet header no longer has a gradient. */
  gradientFrom?: string

  /** @deprecated Ignored. The sheet header no longer has a gradient. */
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

  /** Asset type label (e.g. "Domain"). Defaults to the asset type's label. */
  assetTypeName?: string

  /** Show the Owners tab (default: true). */
  showOwnersTab?: boolean

  /**
   * Show the generic Properties section (the asset's raw `properties`).
   * Defaults to true only when the caller passes no `overviewContent`, since
   * per-type pages render their own curated metadata sections.
   */
  showProperties?: boolean

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

function TabCount({ value }: { value: number }) {
  return (
    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none font-semibold tabular-nums">
      {value}
    </span>
  )
}

// ============================================
// Component
// ============================================

export function AssetDetailSheet<T extends Asset>({
  asset,
  open,
  onOpenChange,
  icon: iconProp,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
  quickActions,
  statsContent,
  overviewContent,
  subtitle,
  assetTypeName: assetTypeNameProp,
  showOwnersTab = true,
  showProperties,
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

  const Icon = iconProp ?? getAssetTypeIcon(asset.type)
  const assetTypeName = assetTypeNameProp ?? getAssetTypeLabel(asset.type)
  const renderProperties = showProperties ?? overviewContent === undefined

  // Control plane is a property of relationship edges, not an asset column: the
  // asset is control-plane when it is the target of an is_control_plane edge
  // (same rule as the API's is_control_plane list filter). The API never sends
  // an asset-level flag, which is why this badge never appeared before.
  const isControlPlane =
    asset.isControlPlane ||
    relationships.some((r) => r.targetAssetId === asset.id && r.isControlPlane)

  // Determine if we should show relationships
  const hasRelationships = relationships.length > 0
  const shouldShowRelationshipPreview = showRelationshipPreview ?? hasRelationships

  // Every tab body scrolls on its own below the pinned header + tab strip.
  const tabBody = 'mt-0 flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-6 sm:px-6'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* The shell is a flex column with no own scroll. The header and the
          tab strip are shrink-0 (pinned), and only the active TabsContent
          scrolls. Layout follows the Finding details drawer. */}
      <SheetContent
        className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <SheetTitle>{assetTypeName} details</SheetTitle>
          <SheetDescription>
            {assetTypeName} detail panel for {asset.name}. Use the tabs to view stats, findings,
            owners, relationships and metadata.
          </SheetDescription>
        </VisuallyHidden>

        {/* Header — pinned at the top */}
        <TooltipProvider>
          <div className="shrink-0">
            <SheetDetailToolbar
              title={`${assetTypeName} details`}
              onClose={() => onOpenChange(false)}
              onEdit={canEdit ? onEdit : undefined}
              onCopyId={() => {
                copyToClipboard(asset.id)
                toast.success('Asset ID copied')
              }}
            />

            {/* Classification badges — scope/exposure/criticality plus the
                CTEM Scoping register signals (control-plane flag + CIA
                business-impact ratings), so the edit → verify loop is closed
                (api #467). Lifecycle snooze shows on every asset so operators
                can pause the worker during known offline windows. */}
            <DetailSheetHeader
              icon={Icon}
              title={asset.name}
              subtitle={
                subtitle ||
                asset.groupName ||
                [assetTypeName, asset.subType && asset.subType !== asset.type && asset.subType]
                  .filter(Boolean)
                  .join(' · ')
              }
              status={
                <AssetStatusBadge
                  status={asset.status}
                  daysSinceLastSeen={daysSinceLastSeen(asset.lastSeen)}
                />
              }
              badges={
                <>
                  <ClassificationBadges
                    scope={asset.scope}
                    exposure={asset.exposure}
                    criticality={asset.criticality}
                    size="md"
                    showTooltips
                    className="flex-wrap"
                  />
                  {isControlPlane && <ControlPlaneBadge size="md" />}
                  <CIABadges
                    confidentiality={asset.impactConfidentiality}
                    integrity={asset.impactIntegrity}
                    availability={asset.impactAvailability}
                    size="md"
                    className="flex-wrap"
                  />
                </>
              }
              actions={
                <>
                  {quickActions}
                  <LifecycleSnoozeMenu
                    assetID={asset.id}
                    isStaleOrInactive={asset.status === 'stale' || asset.status === 'inactive'}
                  />
                </>
              }
              className="pb-2"
            />
          </div>
        </TooltipProvider>

        {/* Tabs — flex-1 + min-h-0 lets the Tabs region take the remaining
            height; the default line TabsList scrolls horizontally on phones. */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <div className="shrink-0 px-4 sm:px-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {showOwnersTab && <TabsTrigger value="owners">Owners</TabsTrigger>}
              {extraTabs?.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
              <TabsTrigger value="relationships">
                Relations
                {relationships.length > 0 && <TabCount value={relationships.length} />}
              </TabsTrigger>
              {showFindingsTab && (
                <TabsTrigger value="findings">
                  Findings
                  {asset.findingCount > 0 && <TabCount value={asset.findingCount} />}
                </TabsTrigger>
              )}
              {showDetailsTab && <TabsTrigger value="details">Details</TabsTrigger>}
            </TabsList>
          </div>

          <TabsContent value="overview" className={tabBody}>
            <DetailSections>
              {/* Order follows the triage question: how risky, who owns it,
                  what it is, how exposed, where it came from. */}
              <RiskSummarySection
                asset={asset}
                onViewFindings={showFindingsTab ? () => setActiveTab('findings') : undefined}
              />

              {statsContent}

              <OwnershipSection
                asset={asset}
                onManageOwners={showOwnersTab ? () => setActiveTab('owners') : undefined}
              />

              {asset.description && (
                <DetailSection title="Description" icon={FileText}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {asset.description}
                  </p>
                </DetailSection>
              )}

              <ExposureSection asset={asset} isControlPlane={isControlPlane} />

              {overviewContent}

              <DiscoverySection asset={asset} />

              {renderProperties && <PropertiesSection properties={asset.metadata} />}

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
            </DetailSections>
          </TabsContent>

          {showOwnersTab && (
            <TabsContent value="owners" className={tabBody}>
              <AssetOwnersTab assetId={asset.id} />
            </TabsContent>
          )}

          {/* Extra Tabs — same flex-1 + scroll pattern as Overview */}
          {extraTabs?.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className={tabBody}>
              {tab.content}
            </TabsContent>
          ))}

          {/* Relationships Tab — self-contained container handles Add /
              Edit / Delete dialogs internally. The only callback we
              forward is onNavigateToAsset because the sheet itself
              cannot swap its own selectedAsset. */}
          <TabsContent value="relationships" className={tabBody}>
            <AssetRelationshipsTab
              assetId={asset.id}
              sourceAsset={{ id: asset.id, name: asset.name, type: asset.type }}
              onNavigateToAsset={onNavigateToAsset}
            />
          </TabsContent>

          {/* Findings Tab */}
          {showFindingsTab && (
            <TabsContent value="findings" className={tabBody}>
              <AssetFindings assetId={asset.id} assetName={asset.name} />
            </TabsContent>
          )}

          {/* Details Tab */}
          {showDetailsTab && (
            <TabsContent value="details" className={tabBody}>
              <DetailSections>
                <TimelineSection
                  firstSeen={asset.firstSeen}
                  lastSeen={asset.lastSeen}
                  createdAt={asset.createdAt}
                  updatedAt={asset.updatedAt}
                />
                <TechnicalDetailsSection
                  id={asset.id}
                  type={asset.type}
                  groupId={asset.groupId}
                  subType={asset.subType}
                  provider={asset.provider}
                  externalId={asset.externalId}
                  parentId={asset.parentId}
                />
                <AssetMergeHistory assetId={asset.id} />
                {canDelete && (
                  <DangerZoneSection onDelete={onDelete} assetTypeName={assetTypeName} />
                )}
              </DetailSections>
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
