/**
 * Finding Mock Data
 *
 * Mock data for development and testing
 */

import type { Finding, FindingDetail, FindingStats } from '../types'

// Helper to generate dates
const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

const hoursAgo = (hours: number) => {
  const date = new Date()
  date.setHours(date.getHours() - hours)
  return date.toISOString()
}

// ============================================
// MOCK USERS
// ============================================

const mockUsers = {
  nguyenVanA: {
    id: 'usr-001',
    name: 'Nguyen Van An',
    email: 'an.nguyen@rediver.io',
    role: 'analyst' as const,
  },
  tranThiBinh: {
    id: 'usr-002',
    name: 'Tran Thi Binh',
    email: 'binh.tran@rediver.io',
    role: 'analyst' as const,
  },
  leVanCuong: {
    id: 'usr-003',
    name: 'Le Van Cuong',
    email: 'cuong.le@rediver.io',
    role: 'developer' as const,
  },
  phamThiDung: {
    id: 'usr-004',
    name: 'Pham Thi Dung',
    email: 'dung.pham@rediver.io',
    role: 'admin' as const,
  },
  securityLead: {
    id: 'usr-005',
    name: 'Security Lead',
    email: 'lead@rediver.io',
    role: 'admin' as const,
  },
  devTeam: {
    id: 'usr-006',
    name: 'Dev Team',
    email: 'dev@rediver.io',
    role: 'developer' as const,
  },
}

// ============================================
// DETAILED FINDING (for detail page)
// ============================================

export const mockFindingDetail: FindingDetail = {
  id: 'FND-2024-001',
  title: 'WordPress Core - Post Author Email Disclosure',
  description: `WordPress Core is vulnerable to Sensitive Information Exposure in versions between 4.7.0 and 6.3.1 via the User REST endpoint. While the search results do not display user email addresses unless the requesting user has the 'list_users' capability, the search is applied to the user_email column.

This allows an attacker to enumerate valid email addresses on the system by observing the search results. An attacker could use this information for targeted phishing attacks or credential stuffing.

This vulnerability was identified by the "CVE-2023-5561" Nuclei template during our weekly external scan.`,
  severity: 'medium',
  status: 'confirmed',
  cvss: 5.3,
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
  cve: 'CVE-2023-5561',
  cwe: 'CWE-200',
  owasp: 'A01:2021',
  tags: ['wordpress', 'api', 'pii', 'information-disclosure'],

  assets: [
    {
      id: 'asset-001',
      type: 'website',
      name: 'api.company.vn',
      url: 'https://api.company.vn',
      criticality: 'critical',
    },
    {
      id: 'asset-002',
      type: 'website',
      name: 'blog.company.vn',
      url: 'https://blog.company.vn',
      criticality: 'high',
    },
  ],

  evidence: [
    {
      id: 'ev-001',
      type: 'screenshot',
      title: 'API Response with emails',
      content: '/evidence/screenshot-api-response.png',
      mimeType: 'image/png',
      createdAt: daysAgo(2),
      createdBy: mockUsers.nguyenVanA,
    },
    {
      id: 'ev-002',
      type: 'request',
      title: 'HTTP Request - Vulnerable Endpoint',
      content: `GET /wp-json/wp/v2/users?search=test@company.vn HTTP/1.1
Host: api.company.vn
User-Agent: Nuclei - Open-source project
Accept: */*
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`,
      mimeType: 'text/plain',
      createdAt: daysAgo(60),
      createdBy: {
        id: 'system',
        name: 'Nuclei Scanner',
        email: 'scanner@rediver.io',
        role: 'admin',
      },
    },
    {
      id: 'ev-003',
      type: 'response',
      title: 'HTTP Response - Exposed Data',
      content: `HTTP/1.1 200 OK
Content-Type: application/json; charset=UTF-8

[
  {
    "id": 1,
    "name": "admin",
    "url": "",
    "description": "",
    "link": "https://api.company.vn/author/admin/",
    "slug": "admin",
    "avatar_urls": {...}
  }
]`,
      mimeType: 'text/plain',
      createdAt: daysAgo(60),
      createdBy: {
        id: 'system',
        name: 'Nuclei Scanner',
        email: 'scanner@rediver.io',
        role: 'admin',
      },
    },
    {
      id: 'ev-004',
      type: 'code',
      title: 'POC Code - Exploitation Script',
      content: `import requests

def enumerate_emails(target, wordlist):
    """Enumerate valid emails via WordPress REST API"""
    valid_emails = []

    for email in wordlist:
        url = f"{target}/wp-json/wp/v2/users"
        params = {"search": email}

        response = requests.get(url, params=params)

        if response.status_code == 200 and len(response.json()) > 0:
            valid_emails.append(email)
            print(f"[+] Found: {email}")

    return valid_emails

# Usage
target = "https://api.company.vn"
wordlist = ["admin@company.vn", "test@company.vn", "info@company.vn"]
enumerate_emails(target, wordlist)`,
      mimeType: 'text/x-python',
      createdAt: daysAgo(7),
      createdBy: mockUsers.tranThiBinh,
    },
  ],

  remediation: {
    description:
      'Update WordPress Core to version 6.3.2 or later. If update is not immediately possible, consider restricting access to the REST API user endpoint.',
    steps: [
      {
        id: 'step-1',
        description: 'Identify all affected WordPress installations',
        status: 'completed',
        completedBy: mockUsers.devTeam,
        completedAt: daysAgo(2),
      },
      {
        id: 'step-2',
        description: 'Test update on staging environment',
        status: 'completed',
        completedBy: mockUsers.devTeam,
        completedAt: daysAgo(1),
      },
      {
        id: 'step-3',
        description: 'Apply WordPress 6.3.2 update to production',
        status: 'in_progress',
      },
      {
        id: 'step-4',
        description: 'Verify fix and close finding',
        status: 'pending',
      },
    ],
    references: [
      'https://wordpress.org/news/2023/10/wordpress-6-3-2/',
      'https://developer.wordpress.org/rest-api/',
      'https://nvd.nist.gov/vuln/detail/CVE-2023-5561',
    ],
    deadline: daysAgo(-7), // 7 days from now
    progress: 45,
  },

  assignee: mockUsers.nguyenVanA,
  team: 'Security Team',

  source: 'dast',
  scanner: 'Nuclei Scanner',
  scanId: 'SCAN-1234',

  relatedFindings: ['FND-2024-002', 'FND-2024-003'],
  remediationTaskId: 'TASK-1234',

  discoveredAt: daysAgo(60),
  createdAt: daysAgo(60),
  updatedAt: hoursAgo(2),

  // Activities
  activities: [
    {
      id: 'act-001',
      type: 'status_changed',
      actor: mockUsers.securityLead,
      previousValue: 'in_progress',
      newValue: 'resolved',
      content: 'Verified fix in production. WordPress updated to 6.3.2 on all affected servers.',
      createdAt: hoursAgo(2),
    },
    {
      id: 'act-002',
      type: 'comment',
      actor: mockUsers.nguyenVanA,
      content:
        'Da patch xong tren staging. Can verify truoc khi deploy production.\n\nTest results show no more email enumeration possible.',
      attachments: [
        {
          id: 'att-001',
          filename: 'staging-test-results.pdf',
          url: '/files/staging-test-results.pdf',
          size: 2300000,
          mimeType: 'application/pdf',
        },
      ],
      reactions: [
        { emoji: '👍', users: [mockUsers.leVanCuong], count: 2 },
        { emoji: '👀', users: [], count: 1 },
      ],
      replies: [
        {
          id: 'act-002-reply-1',
          type: 'comment',
          actor: mockUsers.leVanCuong,
          content: 'LGTM, go ahead with production deployment',
          createdAt: hoursAgo(4),
        },
      ],
      createdAt: hoursAgo(5),
    },
    {
      id: 'act-003',
      type: 'remediation_started',
      actor: mockUsers.devTeam,
      content: 'Started working on remediation',
      metadata: { deadline: daysAgo(-7) },
      createdAt: daysAgo(1),
    },
    {
      id: 'act-004',
      type: 'severity_changed',
      actor: mockUsers.nguyenVanA,
      previousValue: 'low',
      newValue: 'medium',
      reason: 'Affects user PII exposure, upgrading severity based on impact assessment',
      createdAt: daysAgo(2),
    },
    {
      id: 'act-005',
      type: 'assigned',
      actor: mockUsers.securityLead,
      content: 'Assigned to @nguyen-van-a',
      metadata: {
        assigneeId: mockUsers.nguyenVanA.id,
        assigneeName: mockUsers.nguyenVanA.name,
      },
      createdAt: daysAgo(2),
    },
    {
      id: 'act-006',
      type: 'status_changed',
      actor: mockUsers.securityLead,
      previousValue: 'new',
      newValue: 'triaged',
      content: 'Reproduced on staging server. Valid vulnerability.',
      createdAt: daysAgo(2),
    },
    {
      id: 'act-007',
      type: 'ai_triage',
      actor: 'ai',
      content: JSON.stringify({
        risk: 'medium',
        cvss: 5.3,
        exploitability: 'low',
        affectedAssets: 2,
        summary:
          'WordPress REST API vulnerability allows email enumeration. Limited impact but should be patched to prevent information disclosure.',
        recommendations: [
          'Update to WordPress 6.3.2 or later',
          'Restrict REST API access to authenticated users only',
          'Implement rate limiting on user endpoints',
        ],
        references: ['NVD', 'Wordfence', 'WPScan'],
      }),
      createdAt: daysAgo(2),
    },
    {
      id: 'act-008',
      type: 'evidence_added',
      actor: mockUsers.tranThiBinh,
      content: 'Added POC exploitation script',
      metadata: { evidenceId: 'ev-004', evidenceType: 'code' },
      createdAt: daysAgo(7),
    },
    {
      id: 'act-009',
      type: 'created',
      actor: 'system',
      content: 'Discovered by Nuclei Scanner',
      metadata: {
        scanId: 'SCAN-1234',
        template: 'wordpress-user-enum',
        scanName: 'Weekly External Scan #1234',
      },
      createdAt: daysAgo(60),
    },
  ],

  // Related findings
  similarFindings: [
    {
      id: 'FND-2024-002',
      title: 'WordPress REST API User Enumeration',
      severity: 'medium',
      status: 'confirmed',
      assetName: 'blog.company.vn',
      similarity: 85,
      linkType: 'similar',
    },
    {
      id: 'FND-2024-005',
      title: 'WordPress xmlrpc.php Information Disclosure',
      severity: 'low',
      status: 'resolved',
      assetName: 'api.company.vn',
      similarity: 62,
      linkType: 'similar',
    },
  ],

  linkedFindings: [
    {
      id: 'FND-2024-003',
      title: 'CVE-2023-5560 - WP Admin Email Exposure',
      severity: 'high',
      status: 'in_progress',
      assetName: 'admin.company.vn',
      linkType: 'related',
    },
  ],

  sameCveFindings: [
    {
      id: 'FND-2024-010',
      title: 'WordPress Email Disclosure - Shop',
      severity: 'medium',
      status: 'resolved',
      assetName: 'shop.company.vn',
    },
    {
      id: 'FND-2024-011',
      title: 'WordPress Email Disclosure - Admin Portal',
      severity: 'medium',
      status: 'in_progress',
      assetName: 'admin.company.vn',
    },
    {
      id: 'FND-2024-012',
      title: 'WordPress Email Disclosure - Staging',
      severity: 'medium',
      status: 'duplicate',
      assetName: 'staging.company.vn',
    },
  ],
}

// ============================================
// MOCK FINDINGS LIST
// ============================================

export const mockFindings: Finding[] = [
  {
    id: 'FND-2024-001',
    title: 'WordPress Core - Post Author Email Disclosure',
    description: 'WordPress Core is vulnerable to Sensitive Information Exposure...',
    severity: 'medium',
    status: 'confirmed',
    cvss: 5.3,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
    cve: 'CVE-2023-5561',
    cwe: 'CWE-200',
    assets: [
      { id: 'asset-001', type: 'website', name: 'api.company.vn' },
      { id: 'asset-002', type: 'website', name: 'blog.company.vn' },
    ],
    evidence: [],
    remediation: {
      description: 'Update WordPress Core to version 6.3.2 or later.',
      steps: [],
      references: [],
      progress: 45,
    },
    assignee: mockUsers.nguyenVanA,
    source: 'dast',
    scanner: 'Nuclei Scanner',
    relatedFindings: [],
    discoveredAt: daysAgo(60),
    createdAt: daysAgo(60),
    updatedAt: hoursAgo(2),
  },
  {
    id: 'FND-2024-002',
    title: 'SQL Injection in Search Parameter',
    description: 'Critical SQL injection vulnerability found in the search functionality...',
    severity: 'critical',
    status: 'in_progress',
    cvss: 9.8,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    cve: 'CVE-2024-1234',
    cwe: 'CWE-89',
    assets: [{ id: 'asset-003', type: 'website', name: 'shop.company.vn' }],
    evidence: [],
    remediation: {
      description: 'Implement parameterized queries',
      steps: [],
      references: [],
      progress: 20,
    },
    assignee: mockUsers.leVanCuong,
    source: 'dast',
    relatedFindings: [],
    discoveredAt: daysAgo(3),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },
  {
    id: 'FND-2024-003',
    title: 'Cross-Site Scripting (XSS) in Comment Field',
    description: 'Stored XSS vulnerability in the comment section...',
    severity: 'high',
    status: 'new',
    cvss: 7.1,
    cwe: 'CWE-79',
    assets: [{ id: 'asset-004', type: 'website', name: 'forum.company.vn' }],
    evidence: [],
    remediation: {
      description: 'Sanitize user input and encode output',
      steps: [],
      references: [],
      progress: 0,
    },
    source: 'manual',
    relatedFindings: [],
    discoveredAt: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: 'FND-2024-004',
    title: 'Outdated SSL/TLS Configuration',
    description: 'Server supports outdated TLS 1.0 and weak cipher suites...',
    severity: 'medium',
    status: 'resolved',
    cvss: 5.9,
    cwe: 'CWE-326',
    assets: [
      { id: 'asset-005', type: 'service', name: 'mail.company.vn:443' },
      { id: 'asset-006', type: 'service', name: 'vpn.company.vn:443' },
    ],
    evidence: [],
    remediation: {
      description: 'Disable TLS 1.0/1.1 and weak ciphers',
      steps: [],
      references: [],
      progress: 100,
    },
    assignee: mockUsers.tranThiBinh,
    source: 'dast',
    relatedFindings: [],
    discoveredAt: daysAgo(14),
    resolvedAt: daysAgo(2),
    createdAt: daysAgo(14),
    updatedAt: daysAgo(2),
  },
  {
    id: 'FND-2024-005',
    title: 'Missing Security Headers',
    description: 'Application is missing important security headers...',
    severity: 'low',
    status: 'confirmed',
    cvss: 3.7,
    cwe: 'CWE-693',
    assets: [{ id: 'asset-007', type: 'website', name: 'www.company.vn' }],
    evidence: [],
    remediation: {
      description: 'Add X-Frame-Options, CSP, and other security headers',
      steps: [],
      references: [],
      progress: 0,
    },
    source: 'dast',
    relatedFindings: [],
    discoveredAt: daysAgo(5),
    createdAt: daysAgo(5),
    updatedAt: daysAgo(4),
  },
  {
    id: 'FND-2024-006',
    title: 'Exposed .git Directory',
    description: 'Git repository directory is publicly accessible...',
    severity: 'high',
    status: 'resolved',
    cvss: 7.5,
    cwe: 'CWE-538',
    assets: [{ id: 'asset-008', type: 'website', name: 'dev.company.vn' }],
    evidence: [],
    remediation: {
      description: 'Remove .git directory or restrict access',
      steps: [],
      references: [],
      progress: 100,
    },
    assignee: mockUsers.phamThiDung,
    source: 'dast',
    relatedFindings: [],
    discoveredAt: daysAgo(10),
    resolvedAt: daysAgo(5),
    verifiedAt: daysAgo(3),
    createdAt: daysAgo(10),
    updatedAt: daysAgo(3),
  },
  {
    id: 'FND-2024-007',
    title: 'IDOR in User Profile API',
    description: 'Insecure Direct Object Reference allows accessing other users profiles...',
    severity: 'high',
    status: 'confirmed',
    cvss: 6.5,
    cwe: 'CWE-639',
    assets: [{ id: 'asset-009', type: 'service', name: 'api.company.vn/v1/users' }],
    evidence: [],
    remediation: {
      description: 'Implement proper authorization checks',
      steps: [],
      references: [],
      progress: 0,
    },
    assignee: mockUsers.nguyenVanA,
    source: 'manual',
    relatedFindings: [],
    discoveredAt: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: 'FND-2024-008',
    title: 'Server Version Disclosure',
    description: 'Server banners reveal version information...',
    severity: 'info',
    status: 'resolved',
    cvss: 0,
    cwe: 'CWE-200',
    assets: [{ id: 'asset-010', type: 'service', name: 'nginx.company.vn' }],
    evidence: [],
    remediation: {
      description: 'Hide server version in response headers',
      steps: [],
      references: [],
      progress: 100,
    },
    source: 'dast',
    relatedFindings: [],
    discoveredAt: daysAgo(30),
    resolvedAt: daysAgo(25),
    verifiedAt: daysAgo(20),
    createdAt: daysAgo(30),
    updatedAt: daysAgo(20),
  },
  // Mobile App Findings
  {
    id: 'FND-2024-009',
    title: 'Insecure Data Storage in Mobile App',
    description: 'Sensitive data is stored in plain text on device storage without encryption...',
    severity: 'critical',
    status: 'new',
    cvss: 8.6,
    cwe: 'CWE-922',
    assets: [{ id: 'mobile-001', type: 'domain' as const, name: 'VN Banking Pro' }],
    evidence: [],
    remediation: {
      description:
        'Implement secure storage using Keychain (iOS) or EncryptedSharedPreferences (Android)',
      steps: [],
      references: [],
      progress: 0,
    },
    source: 'manual',
    relatedFindings: [],
    discoveredAt: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: 'FND-2024-010',
    title: 'Hardcoded API Keys in Mobile Application',
    description: 'API keys and secrets are hardcoded in the mobile application source code...',
    severity: 'high',
    status: 'confirmed',
    cvss: 7.5,
    cwe: 'CWE-798',
    assets: [{ id: 'mobile-001', type: 'domain' as const, name: 'VN Banking Pro' }],
    evidence: [],
    remediation: {
      description: 'Move secrets to secure backend configuration',
      steps: [],
      references: [],
      progress: 10,
    },
    assignee: mockUsers.leVanCuong,
    source: 'manual',
    relatedFindings: [],
    discoveredAt: daysAgo(5),
    createdAt: daysAgo(5),
    updatedAt: daysAgo(3),
  },
  {
    id: 'FND-2024-011',
    title: 'Missing Certificate Pinning',
    description:
      'Mobile app does not implement SSL certificate pinning, vulnerable to MITM attacks...',
    severity: 'medium',
    status: 'confirmed',
    cvss: 5.9,
    cwe: 'CWE-295',
    assets: [{ id: 'mobile-002', type: 'domain' as const, name: 'SecureWallet' }],
    evidence: [],
    remediation: {
      description: 'Implement certificate pinning for all API communications',
      steps: [],
      references: [],
      progress: 0,
    },
    source: 'manual',
    relatedFindings: [],
    discoveredAt: daysAgo(7),
    createdAt: daysAgo(7),
    updatedAt: daysAgo(5),
  },
  {
    id: 'FND-2024-012',
    title: 'Debug Mode Enabled in Production Build',
    description: 'Production mobile app build has debug mode enabled, exposing sensitive logs...',
    severity: 'medium',
    status: 'in_progress',
    cvss: 4.3,
    cwe: 'CWE-215',
    assets: [{ id: 'mobile-003', type: 'domain' as const, name: 'VN Shopping' }],
    evidence: [],
    remediation: {
      description: 'Disable debug mode and verbose logging in production builds',
      steps: [],
      references: [],
      progress: 50,
    },
    assignee: mockUsers.tranThiBinh,
    source: 'manual',
    relatedFindings: [],
    discoveredAt: daysAgo(4),
    createdAt: daysAgo(4),
    updatedAt: daysAgo(1),
  },
]

// ============================================
// STATISTICS
// ============================================

export const getFindingStats = (): FindingStats => {
  const stats: FindingStats = {
    total: mockFindings.length,
    bySeverity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      none: 0,
    },
    byStatus: {
      new: 0,
      confirmed: 0,
      in_progress: 0,
      resolved: 0,
      false_positive: 0,
      accepted: 0,
      duplicate: 0,
    },
    averageCvss: 0,
    overdueCount: 0,
    resolvedThisWeek: 0,
    newThisWeek: 0,
  }

  let totalCvss = 0
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  mockFindings.forEach((finding) => {
    stats.bySeverity[finding.severity]++
    stats.byStatus[finding.status]++
    totalCvss += finding.cvss || 0

    const discoveredDate = new Date(finding.discoveredAt)
    if (discoveredDate >= oneWeekAgo) {
      stats.newThisWeek++
    }

    if (finding.resolvedAt) {
      const resolvedDate = new Date(finding.resolvedAt)
      if (resolvedDate >= oneWeekAgo) {
        stats.resolvedThisWeek++
      }
    }
  })

  stats.averageCvss = Number((totalCvss / mockFindings.length).toFixed(1))

  return stats
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export const getFindingById = (id: string): FindingDetail | undefined => {
  if (id === 'FND-2024-001') {
    return mockFindingDetail
  }
  // For other findings, return a basic version
  const finding = mockFindings.find((f) => f.id === id)
  if (finding) {
    return {
      ...finding,
      activities: [],
    }
  }
  return undefined
}

export const getActiveFindingsCount = (): number => {
  return mockFindings.filter(
    (f) => !['resolved', 'verified', 'closed', 'duplicate', 'false_positive'].includes(f.status)
  ).length
}

// ============================================
// FINDING TRENDS (for charts)
// ============================================

export interface FindingTrend {
  date: string
  critical: number
  high: number
  medium: number
  low: number
  info: number
}

export const mockFindingTrends: FindingTrend[] = [
  { date: '2024-07', critical: 2, high: 5, medium: 8, low: 12, info: 3 },
  { date: '2024-08', critical: 3, high: 7, medium: 10, low: 15, info: 4 },
  { date: '2024-09', critical: 4, high: 9, medium: 12, low: 14, info: 5 },
  { date: '2024-10', critical: 5, high: 10, medium: 11, low: 13, info: 4 },
  { date: '2024-11', critical: 4, high: 9, medium: 9, low: 10, info: 3 },
  { date: '2024-12', critical: 4, high: 8, medium: 7, low: 5, info: 2 },
]
