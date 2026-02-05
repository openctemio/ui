/**
 * Business Unit Types
 */

export type BusinessUnitStatus = "active" | "inactive" | "archived";
export type RiskTolerance = "very_low" | "low" | "medium" | "high" | "very_high";
export type Criticality = "critical" | "high" | "medium" | "low";

export interface BusinessUnit {
  id: string;
  name: string;
  description?: string;
  parentId?: string; // For hierarchy
  status: BusinessUnitStatus;
  criticality: Criticality;
  riskTolerance: RiskTolerance;
  owner: string;
  ownerEmail: string;
  assetCount: number;
  employeeCount: number;
  riskScore: number;
  complianceScore: number;
  children?: BusinessUnit[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BusinessUnitStats {
  total: number;
  active: number;
  inactive: number;
  byRiskTolerance: Record<RiskTolerance, number>;
  byCriticality: Record<Criticality, number>;
  totalAssets: number;
  averageRiskScore: number;
  averageComplianceScore: number;
}
