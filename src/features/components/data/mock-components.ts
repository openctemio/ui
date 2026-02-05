/**
 * Mock data for Components (SBOM/Supply Chain)
 */

import type {
  Component,
  ComponentStats,
  ComponentEcosystem,
  ComponentType,
  LicenseCategory,
  LicenseRisk,
  ComponentVulnerability,
  ComponentSource,
} from "../types";

// Mock vulnerability data
const mockVulnerabilities: ComponentVulnerability[] = [
  {
    id: "vuln-1",
    cveId: "CVE-2024-24758",
    severity: "critical",
    cvssScore: 9.8,
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    title: "Remote Code Execution via Prototype Pollution",
    description: "A vulnerability in lodash allows attackers to inject properties via prototype pollution.",
    fixedVersion: "4.17.21",
    fixAvailable: true,
    exploitAvailable: true,
    exploitMaturity: "functional",
    inCisaKev: true,
    cisaKevDueDate: "2024-03-15",
    epssScore: 0.89,
    epssPercentile: 98,
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2024-24758"],
    advisoryUrl: "https://github.com/lodash/lodash/security/advisories",
    publishedAt: "2024-01-15T00:00:00Z",
    lastModifiedAt: "2024-02-01T00:00:00Z",
  },
  {
    id: "vuln-2",
    cveId: "CVE-2023-45678",
    severity: "high",
    cvssScore: 8.1,
    cvssVector: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H",
    title: "SQL Injection in query builder",
    description: "Improper input sanitization allows SQL injection attacks.",
    fixedVersion: "2.1.0",
    fixAvailable: true,
    exploitAvailable: true,
    exploitMaturity: "proof-of-concept",
    inCisaKev: false,
    epssScore: 0.45,
    epssPercentile: 75,
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2023-45678"],
    publishedAt: "2023-11-10T00:00:00Z",
    lastModifiedAt: "2023-12-01T00:00:00Z",
  },
  {
    id: "vuln-3",
    cveId: "CVE-2024-11111",
    severity: "medium",
    cvssScore: 5.3,
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
    title: "Information Disclosure via Error Messages",
    description: "Verbose error messages may leak sensitive information.",
    fixedVersion: null,
    fixAvailable: false,
    exploitAvailable: false,
    exploitMaturity: "not-defined",
    inCisaKev: false,
    epssScore: 0.12,
    epssPercentile: 35,
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2024-11111"],
    publishedAt: "2024-01-20T00:00:00Z",
    lastModifiedAt: "2024-01-25T00:00:00Z",
  },
];

// Mock source data
const mockSources: ComponentSource[] = [
  {
    id: "src-1",
    type: "project",
    assetId: "repo-1",
    assetName: "frontend-app",
    filePath: "package.json",
    branch: "main",
    commit: "abc123",
    discoveredAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "src-2",
    type: "project",
    assetId: "repo-2",
    assetName: "backend-api",
    filePath: "requirements.txt",
    branch: "main",
    commit: "def456",
    discoveredAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "src-3",
    type: "container",
    assetId: "container-1",
    assetName: "api-gateway:latest",
    filePath: "/app/package-lock.json",
    discoveredAt: "2024-01-16T08:00:00Z",
  },
];

// Mock components data
export const mockComponents: Component[] = [
  {
    id: "comp-1",
    name: "lodash",
    version: "4.17.20",
    ecosystem: "npm",
    type: "library",
    purl: "pkg:npm/lodash@4.17.20",
    description: "Lodash modular utilities",
    homepage: "https://lodash.com",
    repositoryUrl: "https://github.com/lodash/lodash",
    sources: [mockSources[0], mockSources[2]],
    sourceCount: 2,
    isDirect: true,
    depth: 0,
    latestVersion: "4.17.21",
    isOutdated: true,
    vulnerabilities: [mockVulnerabilities[0]],
    vulnerabilityCount: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
    riskScore: 92,
    license: "MIT License",
    licenseId: "MIT",
    licenseCategory: "permissive",
    licenseRisk: "none",
    author: "John-David Dalton",
    publishedAt: "2019-07-15T00:00:00Z",
    downloadCount: 50000000,
    status: "active",
    firstSeen: "2024-01-01T00:00:00Z",
    lastSeen: "2024-01-20T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
  },
  {
    id: "comp-2",
    name: "express",
    version: "4.18.2",
    ecosystem: "npm",
    type: "framework",
    purl: "pkg:npm/express@4.18.2",
    description: "Fast, unopinionated, minimalist web framework",
    homepage: "https://expressjs.com",
    repositoryUrl: "https://github.com/expressjs/express",
    sources: [mockSources[0]],
    sourceCount: 1,
    isDirect: true,
    depth: 0,
    latestVersion: "4.18.2",
    isOutdated: false,
    vulnerabilities: [],
    vulnerabilityCount: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    riskScore: 15,
    license: "MIT License",
    licenseId: "MIT",
    licenseCategory: "permissive",
    licenseRisk: "none",
    author: "TJ Holowaychuk",
    publishedAt: "2023-03-01T00:00:00Z",
    downloadCount: 30000000,
    status: "active",
    firstSeen: "2024-01-01T00:00:00Z",
    lastSeen: "2024-01-20T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
  },
  {
    id: "comp-3",
    name: "Django",
    version: "4.2.0",
    ecosystem: "pypi",
    type: "framework",
    purl: "pkg:pypi/django@4.2.0",
    description: "The Web framework for perfectionists with deadlines",
    homepage: "https://www.djangoproject.com",
    repositoryUrl: "https://github.com/django/django",
    sources: [mockSources[1]],
    sourceCount: 1,
    isDirect: true,
    depth: 0,
    latestVersion: "5.0.1",
    isOutdated: true,
    vulnerabilities: [mockVulnerabilities[1]],
    vulnerabilityCount: { critical: 0, high: 1, medium: 0, low: 0, info: 0 },
    riskScore: 68,
    license: "BSD 3-Clause",
    licenseId: "BSD-3-Clause",
    licenseCategory: "permissive",
    licenseRisk: "none",
    publishedAt: "2023-04-03T00:00:00Z",
    downloadCount: 15000000,
    status: "active",
    firstSeen: "2024-01-02T00:00:00Z",
    lastSeen: "2024-01-20T00:00:00Z",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
  },
  {
    id: "comp-4",
    name: "react",
    version: "18.2.0",
    ecosystem: "npm",
    type: "library",
    purl: "pkg:npm/react@18.2.0",
    description: "React is a JavaScript library for building user interfaces",
    homepage: "https://react.dev",
    repositoryUrl: "https://github.com/facebook/react",
    sources: [mockSources[0]],
    sourceCount: 1,
    isDirect: true,
    depth: 0,
    latestVersion: "18.2.0",
    isOutdated: false,
    vulnerabilities: [],
    vulnerabilityCount: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    riskScore: 5,
    license: "MIT License",
    licenseId: "MIT",
    licenseCategory: "permissive",
    licenseRisk: "none",
    author: "Meta",
    publishedAt: "2022-06-14T00:00:00Z",
    downloadCount: 45000000,
    status: "active",
    firstSeen: "2024-01-01T00:00:00Z",
    lastSeen: "2024-01-20T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
  },
  {
    id: "comp-5",
    name: "axios",
    version: "1.4.0",
    ecosystem: "npm",
    type: "library",
    purl: "pkg:npm/axios@1.4.0",
    description: "Promise based HTTP client for the browser and node.js",
    homepage: "https://axios-http.com",
    repositoryUrl: "https://github.com/axios/axios",
    sources: [mockSources[0], mockSources[2]],
    sourceCount: 2,
    isDirect: true,
    depth: 0,
    latestVersion: "1.6.2",
    isOutdated: true,
    vulnerabilities: [mockVulnerabilities[2]],
    vulnerabilityCount: { critical: 0, high: 0, medium: 1, low: 0, info: 0 },
    riskScore: 42,
    license: "MIT License",
    licenseId: "MIT",
    licenseCategory: "permissive",
    licenseRisk: "none",
    publishedAt: "2023-04-27T00:00:00Z",
    downloadCount: 40000000,
    status: "active",
    firstSeen: "2024-01-01T00:00:00Z",
    lastSeen: "2024-01-20T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
  },
  {
    id: "comp-6",
    name: "moment",
    version: "2.29.4",
    ecosystem: "npm",
    type: "library",
    purl: "pkg:npm/moment@2.29.4",
    description: "Parse, validate, manipulate, and display dates",
    homepage: "https://momentjs.com",
    repositoryUrl: "https://github.com/moment/moment",
    sources: [mockSources[0]],
    sourceCount: 1,
    isDirect: false,
    depth: 2,
    dependencyPath: ["frontend-app", "react-datepicker", "moment"],
    latestVersion: "2.30.1",
    isOutdated: true,
    vulnerabilities: [],
    vulnerabilityCount: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    riskScore: 25,
    license: "MIT License",
    licenseId: "MIT",
    licenseCategory: "permissive",
    licenseRisk: "none",
    publishedAt: "2022-07-06T00:00:00Z",
    downloadCount: 20000000,
    status: "active",
    firstSeen: "2024-01-01T00:00:00Z",
    lastSeen: "2024-01-20T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
  },
  {
    id: "comp-7",
    name: "requests",
    version: "2.31.0",
    ecosystem: "pypi",
    type: "library",
    purl: "pkg:pypi/requests@2.31.0",
    description: "Python HTTP for Humans",
    homepage: "https://requests.readthedocs.io",
    repositoryUrl: "https://github.com/psf/requests",
    sources: [mockSources[1]],
    sourceCount: 1,
    isDirect: true,
    depth: 0,
    latestVersion: "2.31.0",
    isOutdated: false,
    vulnerabilities: [],
    vulnerabilityCount: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    riskScore: 10,
    license: "Apache License 2.0",
    licenseId: "Apache-2.0",
    licenseCategory: "permissive",
    licenseRisk: "none",
    publishedAt: "2023-05-22T00:00:00Z",
    downloadCount: 100000000,
    status: "active",
    firstSeen: "2024-01-02T00:00:00Z",
    lastSeen: "2024-01-20T00:00:00Z",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
  },
  {
    id: "comp-8",
    name: "log4j-core",
    version: "2.14.1",
    ecosystem: "maven",
    type: "library",
    purl: "pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1",
    description: "Apache Log4j Core",
    homepage: "https://logging.apache.org/log4j/2.x/",
    repositoryUrl: "https://github.com/apache/logging-log4j2",
    sources: [mockSources[1]],
    sourceCount: 1,
    isDirect: false,
    depth: 1,
    dependencyPath: ["backend-api", "log4j-core"],
    latestVersion: "2.22.0",
    isOutdated: true,
    vulnerabilities: [
      {
        ...mockVulnerabilities[0],
        id: "vuln-log4j",
        cveId: "CVE-2021-44228",
        title: "Log4Shell - Remote Code Execution",
        description: "Apache Log4j2 vulnerable to RCE via JNDI lookup",
        cvssScore: 10.0,
        epssScore: 0.97,
        epssPercentile: 99,
      },
    ],
    vulnerabilityCount: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
    riskScore: 100,
    license: "Apache License 2.0",
    licenseId: "Apache-2.0",
    licenseCategory: "permissive",
    licenseRisk: "none",
    publishedAt: "2021-03-06T00:00:00Z",
    status: "active",
    firstSeen: "2024-01-05T00:00:00Z",
    lastSeen: "2024-01-20T00:00:00Z",
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
  },
  {
    id: "comp-9",
    name: "ffmpeg",
    version: "4.4.2",
    ecosystem: "apt",
    type: "application",
    purl: "pkg:deb/debian/ffmpeg@4.4.2",
    description: "Tools for transcoding, streaming and playing multimedia",
    homepage: "https://ffmpeg.org",
    sources: [mockSources[2]],
    sourceCount: 1,
    isDirect: true,
    depth: 0,
    latestVersion: "6.1",
    isOutdated: true,
    vulnerabilities: [],
    vulnerabilityCount: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    riskScore: 35,
    license: "GNU GPL v3",
    licenseId: "GPL-3.0",
    licenseCategory: "copyleft",
    licenseRisk: "high",
    status: "active",
    firstSeen: "2024-01-10T00:00:00Z",
    lastSeen: "2024-01-20T00:00:00Z",
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
  },
  {
    id: "comp-10",
    name: "openssl",
    version: "3.0.2",
    ecosystem: "apt",
    type: "library",
    purl: "pkg:deb/debian/openssl@3.0.2",
    description: "Secure Sockets Layer toolkit",
    homepage: "https://www.openssl.org",
    sources: [mockSources[2]],
    sourceCount: 1,
    isDirect: true,
    depth: 0,
    latestVersion: "3.2.0",
    isOutdated: true,
    vulnerabilities: [],
    vulnerabilityCount: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    riskScore: 28,
    license: "Apache License 2.0",
    licenseId: "Apache-2.0",
    licenseCategory: "permissive",
    licenseRisk: "none",
    status: "active",
    firstSeen: "2024-01-10T00:00:00Z",
    lastSeen: "2024-01-20T00:00:00Z",
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
  },
  {
    id: "comp-11",
    name: "gnu-ghostscript",
    version: "10.0.0",
    ecosystem: "apt",
    type: "application",
    purl: "pkg:deb/debian/ghostscript@10.0.0",
    description: "PostScript and PDF interpreter",
    homepage: "https://www.ghostscript.com",
    sources: [mockSources[2]],
    sourceCount: 1,
    isDirect: false,
    depth: 1,
    latestVersion: "10.02.1",
    isOutdated: true,
    vulnerabilities: [],
    vulnerabilityCount: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    riskScore: 20,
    license: "GNU AGPL v3",
    licenseId: "AGPL-3.0",
    licenseCategory: "copyleft",
    licenseRisk: "critical",
    status: "active",
    firstSeen: "2024-01-10T00:00:00Z",
    lastSeen: "2024-01-20T00:00:00Z",
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
  },
  {
    id: "comp-12",
    name: "typescript",
    version: "5.3.3",
    ecosystem: "npm",
    type: "library",
    purl: "pkg:npm/typescript@5.3.3",
    description: "TypeScript is a language for application scale JavaScript development",
    homepage: "https://www.typescriptlang.org",
    repositoryUrl: "https://github.com/microsoft/TypeScript",
    sources: [mockSources[0]],
    sourceCount: 1,
    isDirect: true,
    depth: 0,
    latestVersion: "5.3.3",
    isOutdated: false,
    vulnerabilities: [],
    vulnerabilityCount: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    riskScore: 0,
    license: "Apache License 2.0",
    licenseId: "Apache-2.0",
    licenseCategory: "permissive",
    licenseRisk: "none",
    author: "Microsoft",
    publishedAt: "2024-01-10T00:00:00Z",
    downloadCount: 50000000,
    status: "active",
    firstSeen: "2024-01-01T00:00:00Z",
    lastSeen: "2024-01-20T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
  },
];

// Helper functions
export function getComponents(): Component[] {
  return mockComponents;
}

export function getVulnerableComponents(): Component[] {
  return mockComponents.filter(
    (c) =>
      c.vulnerabilityCount.critical > 0 ||
      c.vulnerabilityCount.high > 0 ||
      c.vulnerabilityCount.medium > 0
  );
}

export function getComponentsByEcosystem(ecosystem: ComponentEcosystem): Component[] {
  return mockComponents.filter((c) => c.ecosystem === ecosystem);
}

export function getComponentStats(): ComponentStats {
  const ecosystemCounts = mockComponents.reduce((acc, c) => {
    acc[c.ecosystem] = (acc[c.ecosystem] || 0) + 1;
    return acc;
  }, {} as Record<ComponentEcosystem, number>);

  const typeCounts = mockComponents.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {} as Record<ComponentType, number>);

  const licenseRiskCounts = mockComponents.reduce((acc, c) => {
    acc[c.licenseRisk] = (acc[c.licenseRisk] || 0) + 1;
    return acc;
  }, {} as Record<LicenseRisk, number>);

  const licenseCategoryCounts = mockComponents.reduce((acc, c) => {
    acc[c.licenseCategory] = (acc[c.licenseCategory] || 0) + 1;
    return acc;
  }, {} as Record<LicenseCategory, number>);

  const vulnTotals = mockComponents.reduce(
    (acc, c) => ({
      critical: acc.critical + c.vulnerabilityCount.critical,
      high: acc.high + c.vulnerabilityCount.high,
      medium: acc.medium + c.vulnerabilityCount.medium,
      low: acc.low + c.vulnerabilityCount.low,
      info: acc.info + c.vulnerabilityCount.info,
    }),
    { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  );

  return {
    totalComponents: mockComponents.length,
    directDependencies: mockComponents.filter((c) => c.isDirect).length,
    transitiveDependencies: mockComponents.filter((c) => !c.isDirect).length,
    byEcosystem: ecosystemCounts as Record<ComponentEcosystem, number>,
    byType: typeCounts as Record<ComponentType, number>,
    totalVulnerabilities:
      vulnTotals.critical + vulnTotals.high + vulnTotals.medium + vulnTotals.low + vulnTotals.info,
    vulnerabilitiesBySeverity: vulnTotals,
    componentsWithVulnerabilities: mockComponents.filter(
      (c) =>
        c.vulnerabilityCount.critical > 0 ||
        c.vulnerabilityCount.high > 0 ||
        c.vulnerabilityCount.medium > 0
    ).length,
    componentsInCisaKev: mockComponents.filter((c) =>
      c.vulnerabilities.some((v) => v.inCisaKev)
    ).length,
    byLicenseRisk: licenseRiskCounts as Record<LicenseRisk, number>,
    byLicenseCategory: licenseCategoryCounts as Record<LicenseCategory, number>,
    outdatedComponents: mockComponents.filter((c) => c.isOutdated).length,
    averageRiskScore: Math.round(
      mockComponents.reduce((acc, c) => acc + c.riskScore, 0) / mockComponents.length
    ),
  };
}

export function getEcosystemStats() {
  const ecosystems: ComponentEcosystem[] = ["npm", "pypi", "maven", "apt", "go", "cargo", "nuget"];

  return ecosystems.map((ecosystem) => {
    const components = mockComponents.filter((c) => c.ecosystem === ecosystem);
    const vulnCount = components.reduce(
      (acc, c) =>
        acc +
        c.vulnerabilityCount.critical +
        c.vulnerabilityCount.high +
        c.vulnerabilityCount.medium,
      0
    );

    return {
      ecosystem,
      count: components.length,
      vulnerabilities: vulnCount,
      outdated: components.filter((c) => c.isOutdated).length,
      avgRiskScore: components.length
        ? Math.round(components.reduce((acc, c) => acc + c.riskScore, 0) / components.length)
        : 0,
    };
  }).filter((e) => e.count > 0);
}

export function getLicenseStats() {
  const licenses = new Map<string, { count: number; risk: LicenseRisk; category: LicenseCategory }>();

  mockComponents.forEach((c) => {
    if (c.licenseId) {
      const existing = licenses.get(c.licenseId);
      if (existing) {
        existing.count++;
      } else {
        licenses.set(c.licenseId, {
          count: 1,
          risk: c.licenseRisk,
          category: c.licenseCategory,
        });
      }
    }
  });

  return Array.from(licenses.entries())
    .map(([id, data]) => ({
      licenseId: id,
      ...data,
    }))
    .sort((a, b) => b.count - a.count);
}
