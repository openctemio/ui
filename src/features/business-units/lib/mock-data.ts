/**
 * Business Units Mock Data
 */

import type { BusinessUnit, BusinessUnitStats } from "../types";

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export const mockBusinessUnits: BusinessUnit[] = [
  {
    id: "bu-001",
    name: "Technology & Engineering",
    description: "Core technology development and infrastructure management",
    status: "active",
    criticality: "critical",
    riskTolerance: "low",
    owner: "Nguyen Van An",
    ownerEmail: "an.nguyen@company.vn",
    assetCount: 156,
    employeeCount: 85,
    riskScore: 72,
    complianceScore: 88,
    tags: ["core", "technology", "development"],
    createdAt: daysAgo(365),
    updatedAt: daysAgo(1),
  },
  {
    id: "bu-002",
    name: "Finance & Accounting",
    description: "Financial operations, accounting, and treasury management",
    status: "active",
    criticality: "critical",
    riskTolerance: "very_low",
    owner: "Tran Thi Binh",
    ownerEmail: "binh.tran@company.vn",
    assetCount: 45,
    employeeCount: 32,
    riskScore: 65,
    complianceScore: 95,
    tags: ["finance", "compliance", "sensitive"],
    createdAt: daysAgo(365),
    updatedAt: daysAgo(2),
  },
  {
    id: "bu-003",
    name: "Human Resources",
    description: "HR operations, recruitment, and employee management",
    status: "active",
    criticality: "high",
    riskTolerance: "low",
    owner: "Le Van Cuong",
    ownerEmail: "cuong.le@company.vn",
    assetCount: 28,
    employeeCount: 18,
    riskScore: 45,
    complianceScore: 92,
    tags: ["hr", "pii", "gdpr"],
    createdAt: daysAgo(300),
    updatedAt: daysAgo(5),
  },
  {
    id: "bu-004",
    name: "Sales & Marketing",
    description: "Sales operations, marketing campaigns, and customer acquisition",
    status: "active",
    criticality: "high",
    riskTolerance: "medium",
    owner: "Pham Thi Dung",
    ownerEmail: "dung.pham@company.vn",
    assetCount: 67,
    employeeCount: 45,
    riskScore: 58,
    complianceScore: 78,
    tags: ["sales", "marketing", "crm"],
    createdAt: daysAgo(280),
    updatedAt: daysAgo(3),
  },
  {
    id: "bu-005",
    name: "Customer Support",
    description: "Customer service and technical support operations",
    status: "active",
    criticality: "medium",
    riskTolerance: "medium",
    owner: "Hoang Van Em",
    ownerEmail: "em.hoang@company.vn",
    assetCount: 34,
    employeeCount: 52,
    riskScore: 42,
    complianceScore: 85,
    tags: ["support", "customer-facing"],
    createdAt: daysAgo(250),
    updatedAt: daysAgo(1),
  },
  {
    id: "bu-006",
    name: "Operations",
    description: "Business operations and logistics management",
    status: "active",
    criticality: "medium",
    riskTolerance: "medium",
    owner: "Vu Thi Giang",
    ownerEmail: "giang.vu@company.vn",
    assetCount: 42,
    employeeCount: 38,
    riskScore: 55,
    complianceScore: 82,
    tags: ["operations", "logistics"],
    createdAt: daysAgo(220),
    updatedAt: daysAgo(4),
  },
  {
    id: "bu-007",
    name: "Legal & Compliance",
    description: "Legal affairs, contracts, and regulatory compliance",
    status: "active",
    criticality: "critical",
    riskTolerance: "very_low",
    owner: "Nguyen Thi Hoa",
    ownerEmail: "hoa.nguyen@company.vn",
    assetCount: 18,
    employeeCount: 12,
    riskScore: 38,
    complianceScore: 98,
    tags: ["legal", "compliance", "contracts"],
    createdAt: daysAgo(365),
    updatedAt: daysAgo(2),
  },
  {
    id: "bu-008",
    name: "Research & Development",
    description: "Product research and new technology development",
    status: "active",
    criticality: "high",
    riskTolerance: "medium",
    owner: "Tran Van Khanh",
    ownerEmail: "khanh.tran@company.vn",
    assetCount: 52,
    employeeCount: 28,
    riskScore: 68,
    complianceScore: 75,
    tags: ["r&d", "innovation", "ip"],
    createdAt: daysAgo(200),
    updatedAt: daysAgo(1),
  },
  {
    id: "bu-009",
    name: "Executive Office",
    description: "Executive leadership and strategic management",
    status: "active",
    criticality: "critical",
    riskTolerance: "very_low",
    owner: "Le Thi Mai",
    ownerEmail: "mai.le@company.vn",
    assetCount: 12,
    employeeCount: 8,
    riskScore: 82,
    complianceScore: 90,
    tags: ["executive", "leadership", "sensitive"],
    createdAt: daysAgo(365),
    updatedAt: daysAgo(1),
  },
  {
    id: "bu-010",
    name: "IT Infrastructure",
    description: "IT infrastructure, networks, and system administration",
    parentId: "bu-001",
    status: "active",
    criticality: "critical",
    riskTolerance: "low",
    owner: "Pham Van Nam",
    ownerEmail: "nam.pham@company.vn",
    assetCount: 89,
    employeeCount: 22,
    riskScore: 75,
    complianceScore: 85,
    tags: ["infrastructure", "network", "admin"],
    createdAt: daysAgo(350),
    updatedAt: daysAgo(1),
  },
  {
    id: "bu-011",
    name: "Software Development",
    description: "Application development and software engineering",
    parentId: "bu-001",
    status: "active",
    criticality: "high",
    riskTolerance: "medium",
    owner: "Hoang Thi Oanh",
    ownerEmail: "oanh.hoang@company.vn",
    assetCount: 67,
    employeeCount: 48,
    riskScore: 62,
    complianceScore: 80,
    tags: ["development", "engineering", "code"],
    createdAt: daysAgo(340),
    updatedAt: daysAgo(2),
  },
  {
    id: "bu-012",
    name: "Data & Analytics",
    description: "Data management, analytics, and business intelligence",
    parentId: "bu-001",
    status: "active",
    criticality: "high",
    riskTolerance: "low",
    owner: "Vu Van Phuc",
    ownerEmail: "phuc.vu@company.vn",
    assetCount: 38,
    employeeCount: 15,
    riskScore: 70,
    complianceScore: 82,
    tags: ["data", "analytics", "bi"],
    createdAt: daysAgo(280),
    updatedAt: daysAgo(3),
  },
];

export const getBusinessUnitById = (id: string): BusinessUnit | undefined => {
  return mockBusinessUnits.find((bu) => bu.id === id);
};

export const getBusinessUnits = (): BusinessUnit[] => {
  return [...mockBusinessUnits];
};

export const getChildBusinessUnits = (parentId: string): BusinessUnit[] => {
  return mockBusinessUnits.filter((bu) => bu.parentId === parentId);
};

export const getRootBusinessUnits = (): BusinessUnit[] => {
  return mockBusinessUnits.filter((bu) => !bu.parentId);
};

export const getBusinessUnitStats = (): BusinessUnitStats => {
  const units = mockBusinessUnits;
  return {
    total: units.length,
    active: units.filter((bu) => bu.status === "active").length,
    inactive: units.filter((bu) => bu.status === "inactive").length,
    byRiskTolerance: {
      very_low: units.filter((bu) => bu.riskTolerance === "very_low").length,
      low: units.filter((bu) => bu.riskTolerance === "low").length,
      medium: units.filter((bu) => bu.riskTolerance === "medium").length,
      high: units.filter((bu) => bu.riskTolerance === "high").length,
      very_high: units.filter((bu) => bu.riskTolerance === "very_high").length,
    },
    byCriticality: {
      critical: units.filter((bu) => bu.criticality === "critical").length,
      high: units.filter((bu) => bu.criticality === "high").length,
      medium: units.filter((bu) => bu.criticality === "medium").length,
      low: units.filter((bu) => bu.criticality === "low").length,
    },
    totalAssets: units.reduce((acc, bu) => acc + bu.assetCount, 0),
    averageRiskScore: Math.round(
      units.reduce((acc, bu) => acc + bu.riskScore, 0) / units.length
    ),
    averageComplianceScore: Math.round(
      units.reduce((acc, bu) => acc + bu.complianceScore, 0) / units.length
    ),
  };
};
