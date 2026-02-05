/**
 * Domain Hierarchy Utilities
 *
 * Functions to parse domain names and build hierarchical tree structures
 * for displaying domains with their subdomains.
 */

import type { Asset } from "../types";

/**
 * Domain tree node representing a domain and its subdomains
 */
export interface DomainTreeNode {
  /** The domain asset */
  domain: Asset;
  /** Child subdomains */
  subdomains: DomainTreeNode[];
  /** Depth level (0 = root, 1 = subdomain, etc.) */
  level: number;
  /** Whether this node is expanded in the UI */
  isExpanded?: boolean;
}

/**
 * Flattened domain row for table display with hierarchy info
 */
export interface DomainTableRow extends Asset {
  /** Depth level for indentation (0 = root) */
  _level: number;
  /** Whether this is a root domain */
  _isRoot: boolean;
  /** Whether this row has children */
  _hasChildren: boolean;
  /** Number of subdomains */
  _subdomainCount: number;
  /** Parent domain name (for subdomains) */
  _parentDomain?: string;
  /** Root domain name */
  _rootDomain: string;
  /** Child domain IDs for expansion tracking */
  _childIds: string[];
}

/**
 * Public Suffix List (simplified) for common TLDs
 * In production, use a proper PSL library like 'psl'
 */
const PUBLIC_SUFFIXES = new Set([
  // Generic TLDs
  'com', 'net', 'org', 'edu', 'gov', 'mil', 'int',
  // Country-code TLDs
  'vn', 'io', 'co', 'uk', 'de', 'fr', 'jp', 'cn', 'au', 'ca', 'us',
  // Second-level TLDs
  'com.vn', 'net.vn', 'org.vn', 'edu.vn', 'gov.vn',
  'co.uk', 'org.uk', 'ac.uk',
  'com.au', 'net.au', 'org.au',
  'co.jp', 'ne.jp', 'or.jp',
]);

/**
 * Extract the root domain from a full domain name
 *
 * Examples:
 * - api.vnsecurity.io -> vnsecurity.io
 * - staging.api.example.com.vn -> example.com.vn
 * - example.com -> example.com
 *
 * @param domain - Full domain name
 * @returns Root domain
 */
export function extractRootDomain(domain: string): string {
  const parts = domain.toLowerCase().split('.');

  if (parts.length <= 2) {
    return domain.toLowerCase();
  }

  // Check for two-part TLDs (e.g., com.vn, co.uk)
  const lastTwo = parts.slice(-2).join('.');
  if (PUBLIC_SUFFIXES.has(lastTwo)) {
    // Return domain.tld.tld format (e.g., example.com.vn)
    return parts.slice(-3).join('.');
  }

  // Single TLD (e.g., .io, .com)
  return parts.slice(-2).join('.');
}

/**
 * Get the parent domain of a subdomain
 *
 * Examples:
 * - api.vnsecurity.io -> vnsecurity.io
 * - staging.api.example.com -> api.example.com
 *
 * @param domain - Domain name
 * @returns Parent domain or null if root
 */
export function getParentDomain(domain: string): string | null {
  const rootDomain = extractRootDomain(domain);

  if (domain.toLowerCase() === rootDomain) {
    return null;
  }

  const parts = domain.split('.');
  const rootParts = rootDomain.split('.');

  if (parts.length <= rootParts.length) {
    return null;
  }

  // Remove first part to get parent
  return parts.slice(1).join('.');
}

/**
 * Calculate domain depth level
 *
 * @param domain - Domain name
 * @returns Depth level (0 = root)
 */
export function getDomainLevel(domain: string): number {
  const rootDomain = extractRootDomain(domain);

  if (domain.toLowerCase() === rootDomain) {
    return 0;
  }

  const domainParts = domain.split('.');
  const rootParts = rootDomain.split('.');

  return domainParts.length - rootParts.length;
}

/**
 * Check if domain A is a subdomain of domain B
 */
export function isSubdomainOf(domain: string, parent: string): boolean {
  const domainLower = domain.toLowerCase();
  const parentLower = parent.toLowerCase();

  if (domainLower === parentLower) {
    return false;
  }

  return domainLower.endsWith('.' + parentLower);
}

/**
 * Build a hierarchical tree from a flat list of domain assets
 *
 * @param domains - Flat array of domain assets
 * @returns Array of root domain tree nodes
 */
export function buildDomainTree(domains: Asset[]): DomainTreeNode[] {
  // Group domains by root domain
  const domainMap = new Map<string, Asset[]>();

  domains.forEach(domain => {
    const rootDomain = extractRootDomain(domain.name);
    const existing = domainMap.get(rootDomain) || [];
    existing.push(domain);
    domainMap.set(rootDomain, existing);
  });

  const trees: DomainTreeNode[] = [];

  domainMap.forEach((domainList, _rootDomainName) => {
    // Sort by domain length (shorter = higher in hierarchy)
    const sorted = [...domainList].sort((a, b) =>
      a.name.split('.').length - b.name.split('.').length
    );

    // Find or create root domain
    let rootAsset = sorted.find(d => extractRootDomain(d.name) === d.name.toLowerCase());

    // If no root domain asset exists, use the shortest domain as root representative
    if (!rootAsset) {
      rootAsset = sorted[0];
    }

    // Build tree recursively
    const rootNode: DomainTreeNode = {
      domain: rootAsset,
      subdomains: [],
      level: 0,
    };

    // Add subdomains
    sorted.forEach(domain => {
      if (domain.id !== rootAsset!.id) {
        const node: DomainTreeNode = {
          domain,
          subdomains: [],
          level: getDomainLevel(domain.name),
        };

        // For simplicity, add all subdomains directly under root
        // In a more complex implementation, you could build nested levels
        rootNode.subdomains.push(node);
      }
    });

    // Sort subdomains alphabetically
    rootNode.subdomains.sort((a, b) => a.domain.name.localeCompare(b.domain.name));

    trees.push(rootNode);
  });

  // Sort trees by root domain name
  trees.sort((a, b) => a.domain.name.localeCompare(b.domain.name));

  return trees;
}

/**
 * Flatten domain tree for table display with hierarchy metadata
 *
 * @param domains - Flat array of domain assets
 * @returns Flattened array with hierarchy info for table display
 */
export function flattenDomainTreeForTable(domains: Asset[]): DomainTableRow[] {
  const tree = buildDomainTree(domains);
  const rows: DomainTableRow[] = [];

  tree.forEach(rootNode => {
    const childIds = rootNode.subdomains.map(s => s.domain.id);

    // Add root domain row
    rows.push({
      ...rootNode.domain,
      _level: 0,
      _isRoot: true,
      _hasChildren: rootNode.subdomains.length > 0,
      _subdomainCount: rootNode.subdomains.length,
      _rootDomain: rootNode.domain.name,
      _childIds: childIds,
    });

    // Add subdomain rows
    rootNode.subdomains.forEach(subNode => {
      rows.push({
        ...subNode.domain,
        _level: subNode.level,
        _isRoot: false,
        _hasChildren: false,
        _subdomainCount: 0,
        _parentDomain: getParentDomain(subNode.domain.name) || rootNode.domain.name,
        _rootDomain: rootNode.domain.name,
        _childIds: [],
      });
    });
  });

  return rows;
}

/**
 * Get aggregate stats for a domain tree (root + subdomains)
 */
export interface DomainTreeStats {
  totalDomains: number;
  totalFindings: number;
  avgRiskScore: number;
  maxRiskScore: number;
  activeCount: number;
  inactiveCount: number;
}

export function getDomainTreeStats(rootNode: DomainTreeNode): DomainTreeStats {
  const allDomains = [rootNode.domain, ...rootNode.subdomains.map(s => s.domain)];

  const totalFindings = allDomains.reduce((sum, d) => sum + d.findingCount, 0);
  const avgRiskScore = allDomains.reduce((sum, d) => sum + d.riskScore, 0) / allDomains.length;
  const maxRiskScore = Math.max(...allDomains.map(d => d.riskScore));

  return {
    totalDomains: allDomains.length,
    totalFindings,
    avgRiskScore: Math.round(avgRiskScore),
    maxRiskScore,
    activeCount: allDomains.filter(d => d.status === 'active').length,
    inactiveCount: allDomains.filter(d => d.status === 'inactive').length,
  };
}
