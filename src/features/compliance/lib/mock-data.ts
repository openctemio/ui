/**
 * Compliance Mock Data
 */

import type {
  ComplianceRequirement,
  ComplianceFrameworkSummary,
  ComplianceStats,
  ComplianceFramework,
} from "../types";

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

export const frameworkNames: Record<ComplianceFramework, string> = {
  pci_dss: "PCI DSS",
  soc2: "SOC 2",
  iso_27001: "ISO 27001",
  gdpr: "GDPR",
  hipaa: "HIPAA",
  nist: "NIST CSF",
  cis: "CIS Controls",
};

export const mockFrameworkSummaries: ComplianceFrameworkSummary[] = [
  {
    framework: "pci_dss",
    name: "PCI DSS",
    description: "Payment Card Industry Data Security Standard",
    totalControls: 12,
    implemented: 8,
    partial: 2,
    notImplemented: 1,
    notApplicable: 1,
    complianceScore: 83,
    lastAudit: daysAgo(90),
    nextAudit: daysFromNow(275),
  },
  {
    framework: "soc2",
    name: "SOC 2",
    description: "Service Organization Control 2",
    totalControls: 64,
    implemented: 52,
    partial: 8,
    notImplemented: 4,
    notApplicable: 0,
    complianceScore: 88,
    lastAudit: daysAgo(180),
    nextAudit: daysFromNow(185),
  },
  {
    framework: "iso_27001",
    name: "ISO 27001",
    description: "Information Security Management",
    totalControls: 114,
    implemented: 95,
    partial: 12,
    notImplemented: 5,
    notApplicable: 2,
    complianceScore: 91,
    lastAudit: daysAgo(365),
    nextAudit: daysFromNow(0),
  },
  {
    framework: "gdpr",
    name: "GDPR",
    description: "General Data Protection Regulation",
    totalControls: 32,
    implemented: 28,
    partial: 3,
    notImplemented: 1,
    notApplicable: 0,
    complianceScore: 94,
    lastAudit: daysAgo(60),
    nextAudit: daysFromNow(305),
  },
];

export const mockRequirements: ComplianceRequirement[] = [
  // PCI DSS
  {
    id: "req-001",
    framework: "pci_dss",
    controlId: "1.1",
    title: "Install and maintain network security controls",
    description: "Establish and implement firewall and router configuration standards",
    category: "Network Security",
    status: "implemented",
    priority: "critical",
    owner: "Pham Van Nam",
    evidenceCount: 5,
    findingCount: 0,
    lastAssessed: daysAgo(30),
    createdAt: daysAgo(365),
    updatedAt: daysAgo(30),
  },
  {
    id: "req-002",
    framework: "pci_dss",
    controlId: "3.4",
    title: "Render PAN unreadable anywhere it is stored",
    description: "Use strong cryptography to protect cardholder data",
    category: "Data Protection",
    status: "implemented",
    priority: "critical",
    owner: "Nguyen Van An",
    evidenceCount: 8,
    findingCount: 0,
    lastAssessed: daysAgo(15),
    createdAt: daysAgo(300),
    updatedAt: daysAgo(15),
  },
  {
    id: "req-003",
    framework: "pci_dss",
    controlId: "6.2",
    title: "Develop secure software",
    description: "Establish secure development lifecycle practices",
    category: "Application Security",
    status: "partial",
    priority: "high",
    owner: "Hoang Thi Oanh",
    dueDate: daysFromNow(30),
    evidenceCount: 3,
    findingCount: 2,
    lastAssessed: daysAgo(45),
    notes: "Need to implement automated SAST scanning",
    createdAt: daysAgo(250),
    updatedAt: daysAgo(10),
  },
  {
    id: "req-004",
    framework: "pci_dss",
    controlId: "8.3",
    title: "Implement MFA for all access",
    description: "Multi-factor authentication for all remote access",
    category: "Access Control",
    status: "implemented",
    priority: "critical",
    owner: "Le Van Cuong",
    evidenceCount: 4,
    findingCount: 0,
    lastAssessed: daysAgo(20),
    createdAt: daysAgo(200),
    updatedAt: daysAgo(20),
  },
  // SOC 2
  {
    id: "req-005",
    framework: "soc2",
    controlId: "CC6.1",
    title: "Logical and Physical Access Controls",
    description: "Implement logical access security software and infrastructure",
    category: "Security",
    status: "implemented",
    priority: "high",
    owner: "Pham Van Nam",
    evidenceCount: 12,
    findingCount: 0,
    lastAssessed: daysAgo(25),
    createdAt: daysAgo(365),
    updatedAt: daysAgo(25),
  },
  {
    id: "req-006",
    framework: "soc2",
    controlId: "CC7.2",
    title: "System Monitoring",
    description: "Monitor system components for anomalies",
    category: "Monitoring",
    status: "implemented",
    priority: "high",
    owner: "Nguyen Van An",
    evidenceCount: 6,
    findingCount: 1,
    lastAssessed: daysAgo(10),
    createdAt: daysAgo(300),
    updatedAt: daysAgo(10),
  },
  {
    id: "req-007",
    framework: "soc2",
    controlId: "CC9.1",
    title: "Risk Mitigation",
    description: "Identify and mitigate vendor and business partner risks",
    category: "Risk Management",
    status: "partial",
    priority: "medium",
    owner: "Tran Thi Binh",
    dueDate: daysFromNow(60),
    evidenceCount: 4,
    findingCount: 3,
    lastAssessed: daysAgo(35),
    notes: "Third-party risk assessments in progress",
    createdAt: daysAgo(180),
    updatedAt: daysAgo(5),
  },
  // ISO 27001
  {
    id: "req-008",
    framework: "iso_27001",
    controlId: "A.5.1",
    title: "Information Security Policies",
    description: "Management direction for information security",
    category: "Governance",
    status: "implemented",
    priority: "critical",
    owner: "Nguyen Thi Hoa",
    evidenceCount: 15,
    findingCount: 0,
    lastAssessed: daysAgo(50),
    createdAt: daysAgo(365),
    updatedAt: daysAgo(50),
  },
  {
    id: "req-009",
    framework: "iso_27001",
    controlId: "A.8.2",
    title: "Information Classification",
    description: "Ensure information receives appropriate protection",
    category: "Asset Management",
    status: "implemented",
    priority: "high",
    owner: "Vu Van Phuc",
    evidenceCount: 8,
    findingCount: 0,
    lastAssessed: daysAgo(40),
    createdAt: daysAgo(300),
    updatedAt: daysAgo(40),
  },
  {
    id: "req-010",
    framework: "iso_27001",
    controlId: "A.12.4",
    title: "Logging and Monitoring",
    description: "Record events and generate evidence",
    category: "Operations Security",
    status: "partial",
    priority: "high",
    owner: "Pham Van Nam",
    dueDate: daysFromNow(15),
    evidenceCount: 5,
    findingCount: 4,
    lastAssessed: daysAgo(20),
    notes: "Log retention policy needs update",
    createdAt: daysAgo(250),
    updatedAt: daysAgo(8),
  },
  // GDPR
  {
    id: "req-011",
    framework: "gdpr",
    controlId: "Art.5",
    title: "Principles of Processing",
    description: "Lawfulness, fairness, and transparency in data processing",
    category: "Data Protection",
    status: "implemented",
    priority: "critical",
    owner: "Nguyen Thi Hoa",
    evidenceCount: 10,
    findingCount: 0,
    lastAssessed: daysAgo(15),
    createdAt: daysAgo(365),
    updatedAt: daysAgo(15),
  },
  {
    id: "req-012",
    framework: "gdpr",
    controlId: "Art.17",
    title: "Right to Erasure",
    description: "Implement data subject right to deletion",
    category: "Data Subject Rights",
    status: "implemented",
    priority: "high",
    owner: "Le Van Cuong",
    evidenceCount: 6,
    findingCount: 0,
    lastAssessed: daysAgo(30),
    createdAt: daysAgo(300),
    updatedAt: daysAgo(30),
  },
  {
    id: "req-013",
    framework: "gdpr",
    controlId: "Art.33",
    title: "Breach Notification",
    description: "Notify supervisory authority within 72 hours",
    category: "Incident Response",
    status: "implemented",
    priority: "critical",
    owner: "Nguyen Thi Hoa",
    evidenceCount: 4,
    findingCount: 0,
    lastAssessed: daysAgo(45),
    createdAt: daysAgo(250),
    updatedAt: daysAgo(45),
  },
  {
    id: "req-014",
    framework: "gdpr",
    controlId: "Art.35",
    title: "Data Protection Impact Assessment",
    description: "Conduct DPIA for high-risk processing",
    category: "Risk Assessment",
    status: "partial",
    priority: "high",
    owner: "Tran Thi Binh",
    dueDate: daysFromNow(45),
    evidenceCount: 3,
    findingCount: 2,
    lastAssessed: daysAgo(60),
    notes: "DPIA template being updated",
    createdAt: daysAgo(180),
    updatedAt: daysAgo(7),
  },
];

export const getRequirementsByFramework = (
  framework: ComplianceFramework
): ComplianceRequirement[] => {
  return mockRequirements.filter((r) => r.framework === framework);
};

export const getRequirementById = (id: string): ComplianceRequirement | undefined => {
  return mockRequirements.find((r) => r.id === id);
};

export const getFrameworkSummary = (
  framework: ComplianceFramework
): ComplianceFrameworkSummary | undefined => {
  return mockFrameworkSummaries.find((f) => f.framework === framework);
};

export const getComplianceStats = (): ComplianceStats => {
  const requirements = mockRequirements;
  return {
    totalFrameworks: mockFrameworkSummaries.length,
    totalControls: requirements.length,
    byStatus: {
      implemented: requirements.filter((r) => r.status === "implemented").length,
      partial: requirements.filter((r) => r.status === "partial").length,
      not_implemented: requirements.filter((r) => r.status === "not_implemented").length,
      not_applicable: requirements.filter((r) => r.status === "not_applicable").length,
    },
    averageComplianceScore: Math.round(
      mockFrameworkSummaries.reduce((acc, f) => acc + f.complianceScore, 0) /
        mockFrameworkSummaries.length
    ),
    overdueControls: requirements.filter(
      (r) => r.dueDate && new Date(r.dueDate) < new Date() && r.status !== "implemented"
    ).length,
  };
};
