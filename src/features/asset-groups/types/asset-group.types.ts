/**
 * Asset Group Types
 *
 * Type definitions for asset groups
 */

import type { Environment, Criticality } from "@/features/shared/types";
import type { AssetType, AssetMetadata } from "@/features/assets/types";

/**
 * Asset Group for organizing assets
 */
export interface AssetGroup {
  id: string;
  name: string;
  description?: string;
  environment: Environment;
  criticality: Criticality;

  // Business Context (CTEM Scoping)
  businessUnit?: string;
  owner?: string;
  ownerEmail?: string;
  tags?: string[];

  // Asset counts
  assetCount: number;
  domainCount: number;
  websiteCount: number;
  serviceCount: number;
  repositoryCount: number;
  /** @deprecated Use repositoryCount instead */
  projectCount: number;
  cloudCount: number;
  credentialCount: number;

  // Risk metrics
  riskScore: number;
  findingCount: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Input Types for Group Operations
// ============================================

/**
 * Input for creating a new asset within group creation flow
 */
export interface CreateAssetInGroupInput {
  type: AssetType;
  name: string;
  description?: string;
  metadata?: Partial<AssetMetadata>;
  tags?: string[];
}

/**
 * Input for creating a new asset group
 * Supports adding assets directly during group creation
 */
export interface CreateAssetGroupInput {
  name: string;
  description?: string;
  environment: Environment;
  criticality: Criticality;

  // Business Context (CTEM Scoping)
  businessUnit?: string;
  owner?: string;
  ownerEmail?: string;
  tags?: string[];

  /**
   * New assets to create and add to this group
   * These assets will be created along with the group
   */
  newAssets?: CreateAssetInGroupInput[];

  /**
   * IDs of existing ungrouped assets to add to this group
   */
  existingAssetIds?: string[];
}

/**
 * Input for updating an asset group
 */
export interface UpdateAssetGroupInput {
  name?: string;
  description?: string;
  environment?: Environment;
  criticality?: Criticality;

  // Business Context (CTEM Scoping)
  businessUnit?: string;
  owner?: string;
  ownerEmail?: string;
  tags?: string[];
}

/**
 * Input for adding assets to an existing group
 */
export interface AddAssetsToGroupInput {
  groupId: string;
  /**
   * New assets to create and add
   */
  newAssets?: CreateAssetInGroupInput[];
  /**
   * Existing asset IDs to move to this group
   */
  existingAssetIds?: string[];
}

/**
 * Input for removing assets from a group (makes them ungrouped)
 */
export interface RemoveAssetsFromGroupInput {
  groupId: string;
  assetIds: string[];
}

/**
 * Input for moving assets between groups
 */
export interface MoveAssetsBetweenGroupsInput {
  assetIds: string[];
  fromGroupId: string;
  toGroupId: string;
}

// ============================================
// Group Statistics
// ============================================

/**
 * Statistics for asset groups
 */
export interface AssetGroupStats {
  totalGroups: number;
  byEnvironment: Record<Environment, number>;
  byCriticality: Record<Criticality, number>;
  totalAssetsInGroups: number;
  ungroupedAssetsCount: number;
  averageAssetsPerGroup: number;
}
