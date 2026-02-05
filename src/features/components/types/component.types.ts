/**
 * Component Types (SBOM / Software Supply Chain)
 *
 * Type definitions for software components, dependencies, and supply chain security.
 * Aligned with CycloneDX and SPDX SBOM standards.
 */

import type { Severity, Status } from "@/features/shared/types";

// ============================================
// Core Types
// ============================================

/**
 * Package ecosystem / package manager
 */
export type ComponentEcosystem =
  | "npm"           // JavaScript/Node.js
  | "pypi"          // Python
  | "maven"         // Java (Maven)
  | "gradle"        // Java (Gradle)
  | "nuget"         // .NET
  | "go"            // Go modules
  | "cargo"         // Rust
  | "rubygems"      // Ruby
  | "composer"      // PHP
  | "cocoapods"     // iOS/macOS
  | "swift"         // Swift Package Manager
  | "pub"           // Dart/Flutter
  | "hex"           // Elixir
  | "packagist"     // PHP (Packagist)
  | "crates"        // Rust (crates.io)
  | "apt"           // Debian/Ubuntu
  | "yum"           // RHEL/CentOS
  | "apk"           // Alpine Linux
  | "homebrew"      // macOS Homebrew
  | "docker"        // Container images
  | "oci";          // OCI images

export const COMPONENT_ECOSYSTEM_LABELS: Record<ComponentEcosystem, string> = {
  npm: "npm",
  pypi: "PyPI",
  maven: "Maven",
  gradle: "Gradle",
  nuget: "NuGet",
  go: "Go",
  cargo: "Cargo",
  rubygems: "RubyGems",
  composer: "Composer",
  cocoapods: "CocoaPods",
  swift: "Swift PM",
  pub: "Pub",
  hex: "Hex",
  packagist: "Packagist",
  crates: "crates.io",
  apt: "APT",
  yum: "YUM",
  apk: "APK",
  homebrew: "Homebrew",
  docker: "Docker",
  oci: "OCI",
};

export const COMPONENT_ECOSYSTEM_ICONS: Record<ComponentEcosystem, string> = {
  npm: "Package",
  pypi: "Package",
  maven: "Package",
  gradle: "Package",
  nuget: "Package",
  go: "Package",
  cargo: "Package",
  rubygems: "Gem",
  composer: "Package",
  cocoapods: "Package",
  swift: "Package",
  pub: "Package",
  hex: "Package",
  packagist: "Package",
  crates: "Package",
  apt: "Package",
  yum: "Package",
  apk: "Package",
  homebrew: "Package",
  docker: "Container",
  oci: "Container",
};

/**
 * Component type classification
 */
export type ComponentType =
  | "library"       // Code library/package
  | "framework"     // Application framework
  | "application"   // Standalone application
  | "container"     // Container image
  | "operating-system"
  | "device"
  | "firmware"
  | "file";

export const COMPONENT_TYPE_LABELS: Record<ComponentType, string> = {
  library: "Library",
  framework: "Framework",
  application: "Application",
  container: "Container",
  "operating-system": "Operating System",
  device: "Device",
  firmware: "Firmware",
  file: "File",
};

/**
 * License risk classification
 */
export type LicenseRisk = "critical" | "high" | "medium" | "low" | "none" | "unknown";

export const LICENSE_RISK_LABELS: Record<LicenseRisk, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
  unknown: "Unknown",
};

export const LICENSE_RISK_COLORS: Record<LicenseRisk, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-500/15", text: "text-red-600", border: "border-red-500/30" },
  high: { bg: "bg-orange-500/15", text: "text-orange-600", border: "border-orange-500/30" },
  medium: { bg: "bg-yellow-500/15", text: "text-yellow-600", border: "border-yellow-500/30" },
  low: { bg: "bg-blue-500/15", text: "text-blue-600", border: "border-blue-500/30" },
  none: { bg: "bg-green-500/15", text: "text-green-600", border: "border-green-500/30" },
  unknown: { bg: "bg-slate-500/15", text: "text-slate-600", border: "border-slate-500/30" },
};

/**
 * License type classification
 */
export type LicenseCategory =
  | "permissive"    // MIT, Apache, BSD
  | "copyleft"      // GPL, AGPL, LGPL
  | "weak-copyleft" // MPL, EPL
  | "proprietary"   // Commercial licenses
  | "public-domain" // CC0, Unlicense
  | "unknown";

export const LICENSE_CATEGORY_LABELS: Record<LicenseCategory, string> = {
  permissive: "Permissive",
  copyleft: "Copyleft",
  "weak-copyleft": "Weak Copyleft",
  proprietary: "Proprietary",
  "public-domain": "Public Domain",
  unknown: "Unknown",
};

/**
 * Common license identifiers (SPDX)
 */
export const COMMON_LICENSES: { id: string; name: string; category: LicenseCategory; risk: LicenseRisk }[] = [
  // Permissive
  { id: "MIT", name: "MIT License", category: "permissive", risk: "none" },
  { id: "Apache-2.0", name: "Apache License 2.0", category: "permissive", risk: "none" },
  { id: "BSD-2-Clause", name: "BSD 2-Clause", category: "permissive", risk: "none" },
  { id: "BSD-3-Clause", name: "BSD 3-Clause", category: "permissive", risk: "none" },
  { id: "ISC", name: "ISC License", category: "permissive", risk: "none" },
  // Copyleft
  { id: "GPL-2.0", name: "GNU GPL v2", category: "copyleft", risk: "high" },
  { id: "GPL-3.0", name: "GNU GPL v3", category: "copyleft", risk: "high" },
  { id: "AGPL-3.0", name: "GNU AGPL v3", category: "copyleft", risk: "critical" },
  { id: "LGPL-2.1", name: "GNU LGPL v2.1", category: "weak-copyleft", risk: "medium" },
  { id: "LGPL-3.0", name: "GNU LGPL v3", category: "weak-copyleft", risk: "medium" },
  // Weak Copyleft
  { id: "MPL-2.0", name: "Mozilla Public License 2.0", category: "weak-copyleft", risk: "low" },
  { id: "EPL-2.0", name: "Eclipse Public License 2.0", category: "weak-copyleft", risk: "low" },
  // Public Domain
  { id: "CC0-1.0", name: "CC0 1.0 Universal", category: "public-domain", risk: "none" },
  { id: "Unlicense", name: "The Unlicense", category: "public-domain", risk: "none" },
];

// ============================================
// Component Source (where the component was found)
// ============================================

export type ComponentSourceType = "project" | "repository" | "container" | "mobile_app" | "host" | "serverless";

export interface ComponentSource {
  id: string;
  type: ComponentSourceType;
  assetId: string;
  assetName: string;
  filePath: string;        // e.g., package.json, requirements.txt, pom.xml
  branch?: string;
  commit?: string;
  discoveredAt: string;
}

// ============================================
// Component Vulnerability
// ============================================

export interface ComponentVulnerability {
  id: string;
  cveId: string;
  severity: Severity;
  cvssScore: number | null;
  cvssVector: string | null;
  title: string;
  description: string;

  // Fix information
  fixedVersion: string | null;
  fixAvailable: boolean;

  // Exploit information
  exploitAvailable: boolean;
  exploitMaturity: "not-defined" | "unproven" | "proof-of-concept" | "functional" | "high";

  // CISA KEV (Known Exploited Vulnerabilities)
  inCisaKev: boolean;
  cisaKevDueDate?: string;

  // EPSS (Exploit Prediction Scoring System)
  epssScore: number | null;      // 0-1 probability
  epssPercentile: number | null; // 0-100 percentile

  // References
  references: string[];
  advisoryUrl?: string;

  // Timestamps
  publishedAt: string;
  lastModifiedAt: string;
}

// ============================================
// Main Component Interface
// ============================================

export interface Component {
  id: string;

  // Identity
  name: string;
  version: string;
  ecosystem: ComponentEcosystem;
  type: ComponentType;

  // Package URL (purl) - standard identifier
  purl: string;  // e.g., pkg:npm/lodash@4.17.21

  // Description
  description?: string;
  homepage?: string;
  repositoryUrl?: string;

  // Source - where this component was found
  sources: ComponentSource[];
  sourceCount: number;

  // Dependency chain
  isDirect: boolean;           // Direct dependency or transitive
  depth: number;               // 0 = direct, 1+ = transitive
  dependencyPath?: string[];   // Full dependency chain

  // Version info
  latestVersion: string | null;
  isOutdated: boolean;
  versionsAvailable?: string[];

  // Security
  vulnerabilities: ComponentVulnerability[];
  vulnerabilityCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  riskScore: number;  // 0-100

  // License
  license: string | null;
  licenseId: string | null;     // SPDX identifier
  licenseCategory: LicenseCategory;
  licenseRisk: LicenseRisk;

  // Metadata
  author?: string;
  maintainers?: string[];
  publishedAt?: string;
  downloadCount?: number;

  // Status
  status: Status;

  // Timestamps
  firstSeen: string;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Component Statistics
// ============================================

export interface ComponentStats {
  totalComponents: number;
  directDependencies: number;
  transitiveDependencies: number;

  // By ecosystem
  byEcosystem: Record<ComponentEcosystem, number>;

  // By type
  byType: Record<ComponentType, number>;

  // Vulnerabilities
  totalVulnerabilities: number;
  vulnerabilitiesBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  componentsWithVulnerabilities: number;

  // CISA KEV
  componentsInCisaKev: number;

  // License
  byLicenseRisk: Record<LicenseRisk, number>;
  byLicenseCategory: Record<LicenseCategory, number>;

  // Outdated
  outdatedComponents: number;

  // Average risk score
  averageRiskScore: number;
}

// ============================================
// SBOM Export Types
// ============================================

export type SbomFormat = "cyclonedx-json" | "cyclonedx-xml" | "spdx-json" | "spdx-tv";

export const SBOM_FORMAT_LABELS: Record<SbomFormat, string> = {
  "cyclonedx-json": "CycloneDX (JSON)",
  "cyclonedx-xml": "CycloneDX (XML)",
  "spdx-json": "SPDX (JSON)",
  "spdx-tv": "SPDX (Tag-Value)",
};

export interface SbomExportOptions {
  format: SbomFormat;
  includeVulnerabilities: boolean;
  includeLicenses: boolean;
  includeTransitive: boolean;
  filterByEcosystem?: ComponentEcosystem[];
  filterBySource?: string[];  // Asset IDs
}

// ============================================
// Input Types
// ============================================

export interface ComponentFilters {
  search?: string;
  ecosystems?: ComponentEcosystem[];
  types?: ComponentType[];
  isDirect?: boolean;
  hasVulnerabilities?: boolean;
  minSeverity?: Severity;
  licenseRisks?: LicenseRisk[];
  licenseCategories?: LicenseCategory[];
  isOutdated?: boolean;
  sourceAssetIds?: string[];
  inCisaKev?: boolean;
}

export interface ComponentSortOptions {
  field: "name" | "riskScore" | "vulnerabilityCount" | "lastSeen" | "sourceCount";
  direction: "asc" | "desc";
}

// ============================================
// Dependency Graph Types
// ============================================

export interface DependencyNode {
  id: string;
  name: string;
  version: string;
  ecosystem: ComponentEcosystem;
  riskScore: number;
  vulnerabilityCount: number;
  isDirect: boolean;
}

export interface DependencyEdge {
  source: string;  // Component ID
  target: string;  // Component ID
  type: "direct" | "transitive";
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  rootNodes: string[];  // Direct dependencies
}
