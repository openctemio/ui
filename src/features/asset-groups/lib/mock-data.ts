/**
 * Asset Group Mock Data
 *
 * Vietnamese company asset groups for development and testing
 */

import type { AssetGroup } from "../types";

// Helper to generate dates
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export const mockAssetGroups: AssetGroup[] = [
  {
    id: "grp-001",
    name: "Production - Core Banking",
    description: "He thong ngan hang loi - Critical banking infrastructure",
    environment: "production",
    criticality: "critical",
    businessUnit: "Technology & Engineering",
    owner: "Nguyen Van Minh",
    ownerEmail: "minh.nguyen@company.vn",
    tags: ["tier-1", "pci-dss", "customer-facing", "financial"],
    assetCount: 45,
    domainCount: 8,
    websiteCount: 12,
    serviceCount: 15,
    projectCount: 5, // @deprecated
    repositoryCount: 5,
    cloudCount: 3,
    credentialCount: 2,
    riskScore: 78,
    findingCount: 18,
    createdAt: daysAgo(365),
    updatedAt: daysAgo(1),
  },
  {
    id: "grp-002",
    name: "Production - E-commerce",
    description: "San thuong mai dien tu - E-commerce platforms",
    environment: "production",
    criticality: "high",
    businessUnit: "Digital Commerce",
    owner: "Tran Thi Lan",
    ownerEmail: "lan.tran@company.vn",
    tags: ["tier-1", "customer-facing", "revenue-generating"],
    assetCount: 67,
    domainCount: 12,
    websiteCount: 25,
    serviceCount: 18,
    projectCount: 8, // @deprecated
    repositoryCount: 8,
    cloudCount: 3,
    credentialCount: 1,
    riskScore: 65,
    findingCount: 12,
    createdAt: daysAgo(300),
    updatedAt: daysAgo(2),
  },
  {
    id: "grp-003",
    name: "Production - API Gateway",
    description: "He thong API Gateway - API management systems",
    environment: "production",
    criticality: "critical",
    businessUnit: "Platform Engineering",
    owner: "Le Hoang Nam",
    ownerEmail: "nam.le@company.vn",
    tags: ["tier-1", "infrastructure", "api", "integration"],
    assetCount: 32,
    domainCount: 4,
    websiteCount: 8,
    serviceCount: 12,
    projectCount: 4, // @deprecated
    repositoryCount: 4,
    cloudCount: 3,
    credentialCount: 1,
    riskScore: 72,
    findingCount: 8,
    createdAt: daysAgo(250),
    updatedAt: daysAgo(1),
  },
  {
    id: "grp-004",
    name: "Staging Environment",
    description: "Moi truong staging - Pre-production testing",
    environment: "staging",
    criticality: "medium",
    businessUnit: "Quality Assurance",
    owner: "Pham Duc Anh",
    ownerEmail: "anh.pham@company.vn",
    tags: ["tier-2", "testing", "pre-production"],
    assetCount: 45,
    domainCount: 6,
    websiteCount: 15,
    serviceCount: 14,
    projectCount: 6, // @deprecated
    repositoryCount: 6,
    cloudCount: 3,
    credentialCount: 1,
    riskScore: 42,
    findingCount: 5,
    createdAt: daysAgo(200),
    updatedAt: daysAgo(3),
  },
  {
    id: "grp-005",
    name: "Partner Systems",
    description: "He thong doi tac - Third-party integrations",
    environment: "production",
    criticality: "high",
    businessUnit: "Business Development",
    owner: "Vo Thanh Hung",
    ownerEmail: "hung.vo@company.vn",
    tags: ["tier-2", "third-party", "integration", "partner"],
    assetCount: 28,
    domainCount: 5,
    websiteCount: 8,
    serviceCount: 10,
    projectCount: 3, // @deprecated
    repositoryCount: 3,
    cloudCount: 1,
    credentialCount: 1,
    riskScore: 58,
    findingCount: 6,
    createdAt: daysAgo(180),
    updatedAt: daysAgo(2),
  },
  {
    id: "grp-006",
    name: "Cloud Infrastructure",
    description: "Ha tang dam may - Cloud resources and services",
    environment: "production",
    criticality: "critical",
    businessUnit: "Infrastructure & Operations",
    owner: "Hoang Thi Mai",
    ownerEmail: "mai.hoang@company.vn",
    tags: ["tier-1", "infrastructure", "cloud", "aws"],
    assetCount: 35,
    domainCount: 2,
    websiteCount: 5,
    serviceCount: 8,
    projectCount: 5, // @deprecated
    repositoryCount: 5,
    cloudCount: 12,
    credentialCount: 3,
    riskScore: 68,
    findingCount: 9,
    createdAt: daysAgo(150),
    updatedAt: daysAgo(1),
  },
  {
    id: "grp-007",
    name: "Internal Tools",
    description: "Cong cu noi bo - Internal utilities and admin tools",
    environment: "production",
    criticality: "medium",
    businessUnit: "IT Operations",
    owner: "Dang Van Tuan",
    ownerEmail: "tuan.dang@company.vn",
    tags: ["tier-3", "internal", "admin", "tools"],
    assetCount: 25,
    domainCount: 3,
    websiteCount: 10,
    serviceCount: 8,
    projectCount: 3, // @deprecated
    repositoryCount: 3,
    cloudCount: 1,
    credentialCount: 0,
    riskScore: 35,
    findingCount: 3,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(4),
  },
  {
    id: "grp-008",
    name: "Development",
    description: "Moi truong phat trien - Development environments",
    environment: "development",
    criticality: "low",
    businessUnit: "Engineering",
    owner: "Bui Minh Duc",
    ownerEmail: "duc.bui@company.vn",
    tags: ["tier-3", "development", "sandbox"],
    assetCount: 18,
    domainCount: 2,
    websiteCount: 6,
    serviceCount: 5,
    projectCount: 4, // @deprecated
    repositoryCount: 4,
    cloudCount: 1,
    credentialCount: 0,
    riskScore: 22,
    findingCount: 2,
    createdAt: daysAgo(100),
    updatedAt: daysAgo(5),
  },
  {
    id: "grp-009",
    name: "Legacy Systems",
    description: "He thong cu - Deprecated systems pending migration",
    environment: "production",
    criticality: "medium",
    businessUnit: "Technology & Engineering",
    owner: "Nguyen Thi Hoa",
    ownerEmail: "hoa.nguyen@company.vn",
    tags: ["legacy", "migration-pending", "tech-debt"],
    assetCount: 8,
    domainCount: 3,
    websiteCount: 3,
    serviceCount: 2,
    projectCount: 0, // @deprecated
    repositoryCount: 0,
    cloudCount: 0,
    credentialCount: 0,
    riskScore: 82,
    findingCount: 7,
    createdAt: daysAgo(500),
    updatedAt: daysAgo(10),
  },
];

// Get single group by ID
export const getAssetGroupById = (id: string): AssetGroup | undefined => {
  return mockAssetGroups.find((g) => g.id === id);
};

// Get all groups
export const getAssetGroups = (): AssetGroup[] => {
  return [...mockAssetGroups];
};

// Mock assets for groups (simplified for demo)
export interface GroupAsset {
  id: string;
  type: "domain" | "website" | "api" | "host" | "cloud" | "repository" | "database";
  name: string;
  status: "active" | "inactive" | "monitoring";
  riskScore: number;
  findingCount: number;
  lastSeen: string;
}

// Generate mock assets for a group
export const getAssetsByGroupId = (groupId: string): GroupAsset[] => {
  const group = getAssetGroupById(groupId);
  if (!group) return [];

  const assets: GroupAsset[] = [];
  const types: GroupAsset["type"][] = ["domain", "website", "api", "host", "cloud", "repository", "database"];
  const statuses: GroupAsset["status"][] = ["active", "inactive", "monitoring"];

  // Generate assets based on group's asset count
  for (let i = 0; i < Math.min(group.assetCount, 20); i++) {
    const type = types[i % types.length];
    const typeIndex = i + 1;

    assets.push({
      id: `${groupId}-asset-${i + 1}`,
      type,
      name: type === "domain"
        ? `${group.name.toLowerCase().replace(/[^a-z0-9]/g, "")}-${typeIndex}.example.vn`
        : type === "website"
        ? `https://app${typeIndex}.example.vn`
        : type === "api"
        ? `api-${typeIndex}.example.vn`
        : type === "host"
        ? `192.168.1.${100 + typeIndex}`
        : type === "cloud"
        ? `aws-${typeIndex}-${group.id}`
        : type === "repository"
        ? `github.com/example/repo-${typeIndex}`
        : `db-${typeIndex}.example.vn`,
      status: statuses[i % statuses.length],
      riskScore: Math.floor(Math.random() * 100),
      findingCount: Math.floor(Math.random() * 10),
      lastSeen: daysAgo(Math.floor(Math.random() * 7)),
    });
  }

  return assets;
};

// Get findings summary for a group
export interface GroupFinding {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  status: "open" | "in_progress" | "resolved";
  assetName: string;
  discoveredAt: string;
}

export const getFindingsByGroupId = (groupId: string): GroupFinding[] => {
  const group = getAssetGroupById(groupId);
  if (!group) return [];

  const findings: GroupFinding[] = [];
  const severities: GroupFinding["severity"][] = ["critical", "high", "medium", "low", "info"];
  const statuses: GroupFinding["status"][] = ["open", "in_progress", "resolved"];

  const findingTitles = [
    "SQL Injection Vulnerability",
    "Cross-Site Scripting (XSS)",
    "Insecure Direct Object Reference",
    "Missing Security Headers",
    "Outdated SSL Certificate",
    "Exposed Admin Panel",
    "Weak Password Policy",
    "Missing Rate Limiting",
    "Information Disclosure",
    "Broken Authentication",
  ];

  for (let i = 0; i < Math.min(group.findingCount, 15); i++) {
    findings.push({
      id: `${groupId}-finding-${i + 1}`,
      title: findingTitles[i % findingTitles.length],
      severity: severities[i % severities.length],
      status: statuses[i % statuses.length],
      assetName: `asset-${i + 1}.example.vn`,
      discoveredAt: daysAgo(Math.floor(Math.random() * 30)),
    });
  }

  return findings;
};

// Stats
export const getAssetGroupStats = () => ({
  total: mockAssetGroups.length,
  byEnvironment: {
    production: mockAssetGroups.filter((g) => g.environment === "production")
      .length,
    staging: mockAssetGroups.filter((g) => g.environment === "staging").length,
    development: mockAssetGroups.filter((g) => g.environment === "development")
      .length,
    testing: mockAssetGroups.filter((g) => g.environment === "testing").length,
  },
  byCriticality: {
    critical: mockAssetGroups.filter((g) => g.criticality === "critical")
      .length,
    high: mockAssetGroups.filter((g) => g.criticality === "high").length,
    medium: mockAssetGroups.filter((g) => g.criticality === "medium").length,
    low: mockAssetGroups.filter((g) => g.criticality === "low").length,
  },
  totalAssets: mockAssetGroups.reduce((acc, g) => acc + g.assetCount, 0),
  totalFindings: mockAssetGroups.reduce((acc, g) => acc + g.findingCount, 0),
  averageRiskScore: Math.round(
    mockAssetGroups.reduce((acc, g) => acc + g.riskScore, 0) /
      mockAssetGroups.length
  ),
});
