/**
 * Approvals Page Tests
 *
 * Tests for the redesigned approval requests page:
 * - Loading state shows skeleton
 * - Error state shows full-page error with retry
 * - Empty state shows message
 * - Stats cards render with counts (CardHeader/CardTitle pattern)
 * - Tab filtering with counts
 * - DataTable renders with data
 * - Back link to findings page
 * - Refresh button
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ============================================
// MOCKS
// ============================================

const mockMutate = vi.fn()
const mockTriggerApprove = vi.fn()
const mockTriggerReject = vi.fn()
const mockTriggerCancel = vi.fn()

vi.mock('@/features/findings/api/use-findings-api', () => ({
  usePendingApprovals: vi.fn(() => ({
    data: null,
    isLoading: true,
    error: null,
    mutate: mockMutate,
  })),
  useApproveStatus: vi.fn(() => ({
    trigger: mockTriggerApprove,
    isMutating: false,
  })),
  useRejectApproval: vi.fn(() => ({
    trigger: mockTriggerReject,
    isMutating: false,
  })),
  useCancelApproval: vi.fn(() => ({
    trigger: mockTriggerCancel,
    isMutating: false,
  })),
}))

vi.mock('@/features/findings/types', () => ({
  APPROVAL_STATUS_CONFIG: {
    pending: { label: 'Pending', variant: 'warning' },
    approved: { label: 'Approved', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'destructive' },
    canceled: { label: 'Canceled', variant: 'secondary' },
  },
  FINDING_STATUS_CONFIG: {
    false_positive: {
      label: 'False Positive',
      color: 'border-slate-500/50',
      bgColor: 'bg-slate-500/20',
      textColor: 'text-slate-400',
      icon: '',
      category: 'closed',
      requiresApproval: true,
    },
    accepted: {
      label: 'Risk Accepted',
      color: 'border-amber-500/50',
      bgColor: 'bg-amber-500/20',
      textColor: 'text-amber-400',
      icon: '',
      category: 'closed',
      requiresApproval: true,
    },
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/api/error-handler', () => ({
  getErrorMessage: vi.fn((_error, fallback) => fallback || 'Error'),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/features/shared/components/page-header', () => ({
  PageHeader: ({
    title,
    description,
    children,
  }: {
    title: string
    description?: string
    children?: React.ReactNode
  }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {children}
    </div>
  ),
}))

vi.mock('@/features/shared/components/data-table/data-table', () => ({
  DataTable: ({
    data,
    emptyMessage,
    emptyDescription,
  }: {
    data: unknown[]
    emptyMessage?: string
    emptyDescription?: string
    columns: unknown[]
    searchPlaceholder?: string
    searchKey?: string
    showColumnToggle?: boolean
    pageSize?: number
  }) => (
    <div data-testid="data-table">
      {data.length === 0 ? (
        <div>
          <p>{emptyMessage}</p>
          <p>{emptyDescription}</p>
        </div>
      ) : (
        <div data-testid="table-rows">
          {data.map((item: unknown, i: number) => (
            <div key={i} data-testid="table-row">
              {JSON.stringify(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  ),
}))

vi.mock('@/features/shared/components/data-table/data-table-column-header', () => ({
  DataTableColumnHeader: ({ title }: { title: string }) => <span>{title}</span>,
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
    justification: 'Code path is unreachable in production.',
    status: 'pending' as const,
    created_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 'approval-2',
    tenant_id: 'tenant-1',
    finding_id: 'finding-xyz789abc012',
    requested_status: 'accepted',
    requested_by: 'user-2',
    justification: 'Risk accepted - legacy decommissioning.',
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
    status: 'rejected' as const,
    rejected_by: 'user-3',
    rejected_at: '2026-03-02T14:00:00Z',
    created_at: '2026-03-01T12:00:00Z',
  },
]

function mockHook(
  overrides: Partial<{
    data: { data: typeof mockApprovals; total: number; page: number; per_page: number } | null
    isLoading: boolean
    error: Error | undefined
  }> = {}
) {
  vi.mocked(usePendingApprovals).mockReturnValue({
    data: null,
    isLoading: false,
    error: undefined,
    mutate: mockMutate,
    isValidating: false,
    ...overrides,
  } as ReturnType<typeof usePendingApprovals>)
}

// ============================================
// TESTS
// ============================================

describe('ApprovalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // PAGE HEADER & NAVIGATION
  // ============================================

  describe('page header', () => {
    it('renders the page title', () => {
      mockHook({ data: { data: [], total: 0, page: 1, per_page: 500 } })
      render(<ApprovalsPage />)
      expect(screen.getByText('Approval Requests')).toBeInTheDocument()
    })

    it('renders description with counts', () => {
      mockHook({ data: { data: mockApprovals, total: 3, page: 1, per_page: 500 } })
      render(<ApprovalsPage />)
      expect(screen.getByText('3 total requests - 1 pending review')).toBeInTheDocument()
    })

    it('shows loading description while fetching', () => {
      mockHook({ isLoading: true })
      render(<ApprovalsPage />)
      expect(screen.getByText('Loading approvals...')).toBeInTheDocument()
    })

    it('renders back link to findings page', () => {
      mockHook({ data: { data: [], total: 0, page: 1, per_page: 500 } })
      render(<ApprovalsPage />)
      const backLink = screen.getByText('Back to Findings')
      expect(backLink.closest('a')).toHaveAttribute('href', '/findings')
    })

    it('renders refresh button', () => {
      mockHook({ data: { data: [], total: 0, page: 1, per_page: 500 } })
      render(<ApprovalsPage />)
      expect(screen.getByText('Refresh')).toBeInTheDocument()
    })
  })

  // ============================================
  // LOADING STATE
  // ============================================

  describe('loading state', () => {
    it('shows skeleton when loading', () => {
      mockHook({ isLoading: true })
      const { container } = render(<ApprovalsPage />)
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // ERROR STATE
  // ============================================

  describe('error state', () => {
    it('shows full-page error with retry button', () => {
      mockHook({ error: new Error('Network error') })
      render(<ApprovalsPage />)
      expect(screen.getByText('Failed to load approvals')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    it('calls mutate when retry is clicked', () => {
      mockHook({ error: new Error('Network error') })
      render(<ApprovalsPage />)
      fireEvent.click(screen.getByText('Retry'))
      expect(mockMutate).toHaveBeenCalled()
    })
  })

  // ============================================
  // EMPTY STATE
  // ============================================

  describe('empty state', () => {
    it('shows empty message when no approvals', () => {
      mockHook({ data: { data: [], total: 0, page: 1, per_page: 500 } })
      render(<ApprovalsPage />)
      expect(screen.getByText('No approval requests')).toBeInTheDocument()
    })
  })

  // ============================================
  // STATS CARDS
  // ============================================

  describe('stats cards', () => {
    it('renders stats with CardDescription labels', () => {
      mockHook({ data: { data: mockApprovals, total: 3, page: 1, per_page: 500 } })
      render(<ApprovalsPage />)

      // CardDescription labels (with icons)
      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('Total')).toBeInTheDocument()
    })

    it('renders correct counts', () => {
      mockHook({ data: { data: mockApprovals, total: 3, page: 1, per_page: 500 } })
      render(<ApprovalsPage />)

      // Counts appear as CardTitle values - "1" for pending, "1" for approved, etc.
      // Use getAllByText since counts appear in both cards and tabs
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================
  // TABS
  // ============================================

  describe('tabs', () => {
    it('renders status filter tabs with counts', () => {
      mockHook({ data: { data: mockApprovals, total: 3, page: 1, per_page: 500 } })
      render(<ApprovalsPage />)

      expect(screen.getByRole('tab', { name: /All \(3\)/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Pending \(1\)/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Approved \(1\)/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Rejected \(1\)/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Canceled \(0\)/i })).toBeInTheDocument()
    })
  })

  // ============================================
  // TABLE RENDERING
  // ============================================

  describe('table rendering', () => {
    it('renders DataTable with all approval data', () => {
      mockHook({ data: { data: mockApprovals, total: 3, page: 1, per_page: 500 } })
      render(<ApprovalsPage />)

      expect(screen.getByTestId('data-table')).toBeInTheDocument()
      const rows = screen.getAllByTestId('table-row')
      expect(rows).toHaveLength(3)
    })
  })

  // ============================================
  // REFRESH
  // ============================================

  describe('refresh', () => {
    it('calls mutate when refresh button is clicked', () => {
      mockHook({ data: { data: [], total: 0, page: 1, per_page: 500 } })
      render(<ApprovalsPage />)
      fireEvent.click(screen.getByText('Refresh'))
      expect(mockMutate).toHaveBeenCalled()
    })
  })
})
