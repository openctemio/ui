/**
 * Compliance Requirements Types
 */

export type ComplianceFramework =
  | "pci_dss"
  | "soc2"
  | "iso_27001"
  | "gdpr"
  | "hipaa"
  | "nist"
  | "cis";

export type ComplianceStatus = "compliant" | "non_compliant" | "partial" | "not_assessed";
export type ControlStatus = "implemented" | "partial" | "not_implemented" | "not_applicable";
export type Priority = "critical" | "high" | "medium" | "low";

export interface ComplianceRequirement {
  id: string;
  framework: ComplianceFramework;
  controlId: string;
  title: string;
  description: string;
  category: string;
  status: ControlStatus;
  priority: Priority;
  owner: string;
  dueDate?: string;
  evidenceCount: number;
  findingCount: number;
  lastAssessed: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceFrameworkSummary {
  framework: ComplianceFramework;
  name: string;
  description: string;
  totalControls: number;
  implemented: number;
  partial: number;
  notImplemented: number;
  notApplicable: number;
  complianceScore: number;
  lastAudit?: string;
  nextAudit?: string;
}

export interface ComplianceStats {
  totalFrameworks: number;
  totalControls: number;
  byStatus: Record<ControlStatus, number>;
  averageComplianceScore: number;
  overdueControls: number;
}
