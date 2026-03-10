/**
 * Approvals Page Tests
 *
 * Tests for the approval requests queue page:
 * - Loading state shows skeleton
 * - Empty state shows message
 * - Table renders with mock data
 * - Status badges show correct labels
 * - Actions dropdown renders
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// ============================================
// MOCKS
// ============================================

const mockMutate = vi.fn()

// Mock the approval API hooks
vi.mock('@/features/findings/api/use-findings-api', () => ({
  usePendingApprovals: vi.fn(() => ({
    data: null,
    isLoading: true,
    error: null,
    mutate: mockMutate,
  })),
  useApproveStatus: vi.fn(() => ({
    trigger: vi.fn(),
    isMutating: false,
  })),
  useRejectApproval: vi.fn(() => ({
    trigger: vi.fn(),
    isMutating: false,
  })),
  useCancelApproval: vi.fn(() => ({
    trigger: vi.fn(),
    isMutating: false,
  })),
}))

// Mock the findings types
vi.mock('@/features/findings/types', () => ({
  APPROVAL_STATUS_CONFIG: {
    pending: { label: 'Pending', variant: 'warning' },
    approved: { label: 'Approved', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'destructive' },
    canceled: { label: 'Canceled', variant: 'secondary' },
  },
  FINDING_STATUS_CONFIG: {
    new: { label: 'New', color: '', bgColor: '', textColor: '', icon: '', category: 'open' },
    confirmed: {
      label: 'Confirmed',
      color: '',
      bgColor: '',
      textColor: '',
      icon: '',
      category: 'open',
    },
    in_progress: {
      label: 'In Progress',
      color: '',
      bgColor: '',
      textColor: '',
      icon: '',
      category: 'in_progress',
    },
    resolved: {
      label: 'Resolved',
      color: '',
      bgColor: '',
      textColor: '',
      icon: '',
      category: 'closed',
    },
    false_positive: {
      label: 'False Positive',
      color: '',
      bgColor: '',
      textColor: '',
      icon: '',
      category: 'closed',
    },
    accepted: {
      label: 'Risk Accepted',
      color: '',
      bgColor: '',
      textColor: '',
      icon: '',
      category: 'closed',
    },
    duplicate: {
      label: 'Duplicate',
      color: '',
      bgColor: '',
      textColor: '',
      icon: '',
      category: 'closed',
    },
  },
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock error handler
vi.mock('@/lib/api/error-handler', () => ({
  getErrorMessage: vi.fn((_error, fallback) => fallback || 'Error'),
}))

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

// Import after mocks
import ApprovalsPage from '../page'
import { usePendingApprovals } from '@/features/findings/api/use-findings-api'

// ============================================
// MOCK DATA
// ============================================

const mockApprovals = [
  {
    id: 'approval-1',
    tenant_id: 'tenant-1',
    finding_id: 'finding-abc123def456',
    requested_status: 'false_positive',
    requested_by: 'user-1',
    justification: 'This is a false positive because the code path is unreachable in production.',
    status: 'pending' as const,
    created_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 'approval-2',
    tenant_id: 'tenant-1',
    finding_id: 'finding-xyz789abc012',
    requested_status: 'accepted',
    requested_by: 'user-2',
    justification: 'Risk accepted for legacy system that will be decommissioned next quarter.',
    status: 'approved' as const,
    approved_by: 'user-3',
    approved_at: '2026-03-02T12:00:00Z',
    expires_at: '2026-06-01T00:00:00Z',
    created_at: '2026-03-01T11:00:00Z',
  },
  {
    id: 'approval-3',
    tenant_id: 'tenant-1',
    finding_id: 'finding-def456ghi789',
    requested_status: 'false_positive',
    requested_by: 'user-1',
    justification: 'Test environment only.',
    rejection_reason: 'Insufficient justification for production environment.',
    status: 'rejected' as const,
    rejected_by: 'user-3',
    rejected_at: '2026-03-02T14:00:00Z',
    created_at: '2026-03-01T12:00:00Z',
  },
]

// ============================================
// TESTS
// ============================================

describe('ApprovalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // LOADING STATE
  // ============================================

  describe('loading state', () => {
    it('shows skeleton when loading', () => {
      vi.mocked(usePendingApprovals).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: undefined,
        mutate: mockMutate,
        isValidating: false,
      } as ReturnType<typeof usePendingApprovals>)

      const { container } = render(<ApprovalsPage />)

      // Skeleton elements should be present
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // EMPTY STATE
  // ============================================

  describe('empty state', () => {
    it('shows "No pending approvals" when no data', () => {
      vi.mocked(usePendingApprovals).mockReturnValue({
        data: { data: [], total: 0, page: 1, per_page: 20 },
        isLoading: false,
        error: undefined,
        mutate: mockMutate,
        isValidating: false,
      } as ReturnType<typeof usePendingApprovals>)

      render(<ApprovalsPage />)

      expect(screen.getByText('No pending approvals')).toBeInTheDocument()
    })
  })

  // ============================================
  // TABLE RENDERING
  // ============================================

  describe('table rendering', () => {
    it('renders approval rows when data is present', () => {
      vi.mocked(usePendingApprovals).mockReturnValue({
        data: { data: mockApprovals, total: 3, page: 1, per_page: 20 },
        isLoading: false,
        error: undefined,
        mutate: mockMutate,
        isValidating: false,
      } as ReturnType<typeof usePendingApprovals>)

      render(<ApprovalsPage />)

      // Table headers should be visible
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Finding')).toBeInTheDocument()
      expect(screen.getByText('Requested Status')).toBeInTheDocument()
      expect(screen.getByText('Justification')).toBeInTheDocument()
    })

    it('renders status badges with correct labels', () => {
      vi.mocked(usePendingApprovals).mockReturnValue({
        data: { data: mockApprovals, total: 3, page: 1, per_page: 20 },
        isLoading: false,
        error: undefined,
        mutate: mockMutate,
        isValidating: false,
      } as ReturnType<typeof usePendingApprovals>)

      render(<ApprovalsPage />)

      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('Approved')).toBeInTheDocument()
      expect(screen.getByText('Rejected')).toBeInTheDocument()
    })

    it('renders requested status labels', () => {
      vi.mocked(usePendingApprovals).mockReturnValue({
        data: { data: mockApprovals, total: 3, page: 1, per_page: 20 },
        isLoading: false,
        error: undefined,
        mutate: mockMutate,
        isValidating: false,
      } as ReturnType<typeof usePendingApprovals>)

      render(<ApprovalsPage />)

      // Two approvals have requested_status 'false_positive', so use getAllByText
      const falsePositiveLabels = screen.getAllByText('False Positive')
      expect(falsePositiveLabels.length).toBe(2)
      expect(screen.getByText('Risk Accepted')).toBeInTheDocument()
    })
  })

  // ============================================
  // ACTIONS DROPDOWN
  // ============================================

  describe('actions dropdown', () => {
    it('renders actions button for pending approvals', () => {
      const pendingOnly = [mockApprovals[0]]
      vi.mocked(usePendingApprovals).mockReturnValue({
        data: { data: pendingOnly, total: 1, page: 1, per_page: 20 },
        isLoading: false,
        error: undefined,
        mutate: mockMutate,
        isValidating: false,
      } as ReturnType<typeof usePendingApprovals>)

      const { container } = render(<ApprovalsPage />)

      // There should be an actions button (the MoreHorizontal trigger)
      const actionButtons = container.querySelectorAll('button')
      expect(actionButtons.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // PAGE HEADER
  // ============================================

  describe('page header', () => {
    it('renders the page title', () => {
      vi.mocked(usePendingApprovals).mockReturnValue({
        data: { data: [], total: 0, page: 1, per_page: 20 },
        isLoading: false,
        error: undefined,
        mutate: mockMutate,
        isValidating: false,
      } as ReturnType<typeof usePendingApprovals>)

      render(<ApprovalsPage />)

      expect(screen.getByText('Approval Requests')).toBeInTheDocument()
    })
  })
})
