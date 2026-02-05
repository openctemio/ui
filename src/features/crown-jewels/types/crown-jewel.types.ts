/**
 * Crown Jewels Types - Critical Asset Management
 */

export type AssetCategory =
  | "data"
  | "system"
  | "application"
  | "infrastructure"
  | "intellectual_property"
  | "financial";

export type ProtectionLevel = "maximum" | "high" | "standard" | "basic";
export type DataClassification = "top_secret" | "confidential" | "internal" | "public";
export type JewelStatus = "protected" | "at_risk" | "exposed" | "under_review";

export interface CrownJewel {
  id: string;
  name: string;
  description?: string;
  category: AssetCategory;
  protectionLevel: ProtectionLevel;
  dataClassification: DataClassification;
  status: JewelStatus;
  businessImpact: string;
  owner: string;
  ownerEmail: string;
  businessUnit: string;
  riskScore: number;
  exposureCount: number;
  dependencyCount: number;
  lastAssessed: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CrownJewelDependency {
  id: string;
  jewelId: string;
  dependsOnId: string;
  dependsOnName: string;
  dependencyType: "upstream" | "downstream" | "bidirectional";
  criticality: "critical" | "high" | "medium" | "low";
}

export interface CrownJewelStats {
  total: number;
  byStatus: Record<JewelStatus, number>;
  byProtectionLevel: Record<ProtectionLevel, number>;
  byCategory: Record<AssetCategory, number>;
  totalExposures: number;
  averageRiskScore: number;
}
