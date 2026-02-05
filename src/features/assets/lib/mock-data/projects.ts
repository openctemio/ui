/**
 * Project Assets Mock Data
 */

import type { BaseAsset } from './helpers'
import { daysAgo } from './helpers'

export const projectAssets: BaseAsset[] = [
  {
    id: 'proj-001',
    type: 'repository',
    name: 'vingroup/core-banking-api',
    description: 'Core Banking API Service',
    status: 'active',
    riskScore: 62,
    findingCount: 4,
    groupId: 'grp-001',
    groupName: 'Production - Core Banking',
    metadata: {
      projectProvider: 'github',
      visibility: 'private',
      language: 'Java',
      stars: 0,
    },
    tags: ['critical', 'backend'],
    firstSeen: daysAgo(500),
    lastSeen: daysAgo(0),
    createdAt: daysAgo(500),
    updatedAt: daysAgo(1),
  },
  {
    id: 'proj-002',
    type: 'repository',
    name: 'fpt/ecommerce-frontend',
    description: 'E-commerce Frontend Application',
    status: 'active',
    riskScore: 35,
    findingCount: 2,
    groupId: 'grp-002',
    groupName: 'Production - E-commerce',
    metadata: {
      projectProvider: 'gitlab',
      visibility: 'private',
      language: 'TypeScript',
      stars: 0,
    },
    tags: ['frontend', 'production'],
    firstSeen: daysAgo(300),
    lastSeen: daysAgo(0),
    createdAt: daysAgo(300),
    updatedAt: daysAgo(2),
  },
  {
    id: 'proj-003',
    type: 'repository',
    name: 'viettel/infrastructure-terraform',
    description: 'Infrastructure as Code',
    status: 'active',
    riskScore: 78,
    findingCount: 6,
    groupId: 'grp-006',
    groupName: 'Cloud Infrastructure',
    metadata: {
      projectProvider: 'github',
      visibility: 'private',
      language: 'HCL',
      stars: 0,
    },
    tags: ['critical', 'infrastructure'],
    firstSeen: daysAgo(250),
    lastSeen: daysAgo(0),
    createdAt: daysAgo(250),
    updatedAt: daysAgo(0),
  },
  {
    id: 'proj-004',
    type: 'repository',
    name: 'techcombank/mobile-app',
    description: 'Mobile Banking Application',
    status: 'active',
    riskScore: 85,
    findingCount: 7,
    groupId: 'grp-001',
    groupName: 'Production - Core Banking',
    metadata: {
      projectProvider: 'bitbucket',
      visibility: 'private',
      language: 'Kotlin',
      stars: 0,
    },
    tags: ['critical', 'mobile', 'banking'],
    firstSeen: daysAgo(400),
    lastSeen: daysAgo(0),
    createdAt: daysAgo(400),
    updatedAt: daysAgo(1),
  },
  {
    id: 'proj-005',
    type: 'repository',
    name: 'vpbank/docs-public',
    description: 'Public Documentation',
    status: 'active',
    riskScore: 15,
    findingCount: 1,
    groupId: 'grp-005',
    groupName: 'Partner Systems',
    metadata: {
      projectProvider: 'github',
      visibility: 'public',
      language: 'Markdown',
      stars: 12,
    },
    tags: ['documentation', 'public'],
    firstSeen: daysAgo(100),
    lastSeen: daysAgo(0),
    createdAt: daysAgo(100),
    updatedAt: daysAgo(5),
  },
]

/**
 * @deprecated Use projectAssets instead
 */
export const repositoryAssets = projectAssets
