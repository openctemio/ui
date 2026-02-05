/**
 * Mock Scope Data
 *
 * This file provides mock scope targets and exclusions that can be used
 * by Assets pages to display scope status.
 */

import type { ScopeTarget, ScopeExclusion } from "../types";

export const mockScopeTargets: ScopeTarget[] = [
  // Domains
  {
    id: "scope-001",
    type: "domain",
    pattern: "*.techcombank.com.vn",
    description: "Main banking domain and subdomains",
    status: "active",
    priority: "critical",
    addedAt: "2024-01-15",
    addedBy: "Nguyen Van An",
  },
  {
    id: "scope-002",
    type: "domain",
    pattern: "*.tcb.com.vn",
    description: "Short domain alias",
    status: "active",
    priority: "high",
    addedAt: "2024-01-15",
    addedBy: "Nguyen Van An",
  },
  {
    id: "scope-003",
    type: "domain",
    pattern: "*.vingroup.vn",
    description: "Vingroup domains",
    status: "active",
    priority: "high",
    addedAt: "2024-02-01",
    addedBy: "Tran Thi Binh",
  },
  // IP Ranges
  {
    id: "scope-004",
    type: "ip_range",
    pattern: "10.0.0.0/8",
    description: "Internal network range",
    status: "active",
    priority: "high",
    addedAt: "2024-01-20",
    addedBy: "Tran Thi Binh",
  },
  {
    id: "scope-005",
    type: "ip_range",
    pattern: "192.168.0.0/16",
    description: "Private network range",
    status: "active",
    priority: "medium",
    addedAt: "2024-01-20",
    addedBy: "Tran Thi Binh",
  },
  // Cloud Accounts
  {
    id: "scope-006",
    type: "cloud_account",
    pattern: "AWS:123456789012",
    description: "Production AWS account",
    status: "active",
    priority: "critical",
    addedAt: "2024-02-15",
    addedBy: "Nguyen Van An",
  },
  {
    id: "scope-007",
    type: "cloud_account",
    pattern: "GCP:techcombank-prod",
    description: "Production GCP project",
    status: "active",
    priority: "critical",
    addedAt: "2024-02-15",
    addedBy: "Nguyen Van An",
  },
  {
    id: "scope-008",
    type: "cloud_account",
    pattern: "Azure:sub-12345",
    description: "Azure subscription",
    status: "active",
    priority: "high",
    addedAt: "2024-02-20",
    addedBy: "Le Van Cuong",
  },
  // Projects
  {
    id: "scope-009",
    type: "project",
    pattern: "github.com/techcombank/*",
    description: "All GitHub projects",
    status: "active",
    priority: "high",
    addedAt: "2024-02-10",
    addedBy: "Pham Thi Dung",
  },
  // APIs
  {
    id: "scope-010",
    type: "api",
    pattern: "api.techcombank.com.vn/*",
    description: "API Gateway endpoints",
    status: "active",
    priority: "critical",
    addedAt: "2024-02-01",
    addedBy: "Le Van Cuong",
  },
  // Databases
  {
    id: "scope-011",
    type: "database",
    pattern: "*.db.techcombank.internal:*",
    description: "Internal databases",
    status: "active",
    priority: "critical",
    addedAt: "2024-02-25",
    addedBy: "Nguyen Van An",
  },
  // Containers
  {
    id: "scope-012",
    type: "container",
    pattern: "registry.techcombank.internal/*",
    description: "Internal container registry",
    status: "active",
    priority: "high",
    addedAt: "2024-03-01",
    addedBy: "Pham Thi Dung",
  },
  // Email domains (for credential monitoring)
  {
    id: "scope-013",
    type: "email_domain",
    pattern: "*@techcombank.com.vn",
    description: "Corporate email domain",
    status: "active",
    priority: "critical",
    addedAt: "2024-01-15",
    addedBy: "Nguyen Van An",
  },
];

export const mockScopeExclusions: ScopeExclusion[] = [
  {
    id: "excl-001",
    type: "domain",
    pattern: "status.techcombank.com.vn",
    reason: "Third-party status page service",
    status: "active",
    addedAt: "2024-01-16",
    addedBy: "Nguyen Van An",
  },
  {
    id: "excl-002",
    type: "ip_range",
    pattern: "10.255.0.0/16",
    reason: "Guest network - out of scope",
    status: "active",
    addedAt: "2024-01-20",
    addedBy: "Tran Thi Binh",
  },
  {
    id: "excl-003",
    type: "domain",
    pattern: "*.cdn.techcombank.com.vn",
    reason: "CDN managed by third-party",
    status: "active",
    addedAt: "2024-02-05",
    addedBy: "Le Van Cuong",
  },
  {
    id: "excl-004",
    type: "path",
    pattern: "/health",
    reason: "Health check endpoints",
    status: "active",
    addedAt: "2024-02-10",
    addedBy: "Pham Thi Dung",
  },
  {
    id: "excl-005",
    type: "path",
    pattern: "/metrics",
    reason: "Prometheus metrics endpoints",
    status: "active",
    addedAt: "2024-02-10",
    addedBy: "Pham Thi Dung",
  },
  {
    id: "excl-006",
    type: "cloud_resource",
    pattern: "arn:aws:s3:::techcombank-logs-*",
    reason: "Log buckets - read-only access",
    status: "active",
    addedAt: "2024-02-20",
    addedBy: "Nguyen Van An",
  },
];

/**
 * Get all active scope targets
 */
export const getActiveScopeTargets = (): ScopeTarget[] => {
  return mockScopeTargets.filter((t) => t.status === "active");
};

/**
 * Get all active scope exclusions
 */
export const getActiveScopeExclusions = (): ScopeExclusion[] => {
  return mockScopeExclusions.filter((e) => e.status === "active");
};

/**
 * Get scope targets by type
 */
export const getScopeTargetsByType = (type: string): ScopeTarget[] => {
  return mockScopeTargets.filter((t) => t.type === type && t.status === "active");
};
