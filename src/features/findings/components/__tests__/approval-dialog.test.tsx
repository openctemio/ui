/**
 * ApprovalDialog Tests
 *
 * Tests for the finding status approval dialog component:
 * - Renders when open
 * - Shows justification textarea
 * - Submit button disabled when justification empty
 * - Calls onOpenChange when closed
 * - Shows target status label
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApprovalDialog } from '../approval-dialog'

// ============================================
// MOCKS
// ============================================

// Mock the approval API hook
const mockRequestApproval = vi.fn()
vi.mock('../../api/use-findings-api', () => ({
  useRequestApproval: vi.fn(() => ({
    trigger: mockRequestApproval,
    isMutating: false,
  })),
}))

// Mock the findings types
vi.mock('../../types', () => ({
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
      label: 'Accepted',
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
    reopened: {
      label: 'Reopened',
      color: '',
      bgColor: '',
      textColor: '',
      icon: '',
      category: 'open',
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
  getErrorMessage: vi.fn((error, fallback) => fallback || 'Error'),
}))

// ============================================
// SETUP
// ============================================

const defaultProps = {
  findingId: 'finding-123',
  targetStatus: 'false_positive' as const,
  open: true,
  onOpenChange: vi.fn(),
}

describe('ApprovalDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // RENDERING
  // ============================================

  describe('rendering', () => {
    it('renders dialog when open is true', () => {
      render(<ApprovalDialog {...defaultProps} />)

      expect(screen.getByText('Request Status Approval')).toBeInTheDocument()
    })

    it('does not render dialog content when open is false', () => {
      render(<ApprovalDialog {...defaultProps} open={false} />)

      expect(screen.queryByText('Request Status Approval')).not.toBeInTheDocument()
    })

    it('shows the target status label in the description', () => {
      render(<ApprovalDialog {...defaultProps} targetStatus="false_positive" />)

      expect(screen.getByText('False Positive')).toBeInTheDocument()
    })

    it('shows justification textarea', () => {
      render(<ApprovalDialog {...defaultProps} />)

      expect(screen.getByLabelText('Justification')).toBeInTheDocument()
    })

    it('shows character count', () => {
      render(<ApprovalDialog {...defaultProps} />)

      expect(screen.getByText('0/2000 characters')).toBeInTheDocument()
    })

    it('shows review and cancel buttons', () => {
      render(<ApprovalDialog {...defaultProps} />)

      expect(screen.getByText('Review')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
  })

  // ============================================
  // SUBMIT BUTTON STATE
  // ============================================

  describe('submit button state', () => {
    it('review button is disabled when justification is empty', () => {
      render(<ApprovalDialog {...defaultProps} />)

      const reviewButton = screen.getByText('Review')
      expect(reviewButton).toBeDisabled()
    })

    it('review button is disabled when justification is only whitespace', async () => {
      const user = userEvent.setup()
      render(<ApprovalDialog {...defaultProps} />)

      const textarea = screen.getByLabelText('Justification')
      await user.type(textarea, '   ')

      const reviewButton = screen.getByText('Review')
      expect(reviewButton).toBeDisabled()
    })

    it('review button is enabled when justification has text', async () => {
      const user = userEvent.setup()
      render(<ApprovalDialog {...defaultProps} />)

      const textarea = screen.getByLabelText('Justification')
      await user.type(textarea, 'This is a valid justification')

      const reviewButton = screen.getByText('Review')
      expect(reviewButton).toBeEnabled()
    })
  })

  // ============================================
  // INTERACTIONS
  // ============================================

  describe('interactions', () => {
    it('calls onOpenChange when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(<ApprovalDialog {...defaultProps} onOpenChange={onOpenChange} />)

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('updates character count as user types', async () => {
      const user = userEvent.setup()
      render(<ApprovalDialog {...defaultProps} />)

      const textarea = screen.getByLabelText('Justification')
      await user.type(textarea, 'Hello')

      expect(screen.getByText('5/2000 characters')).toBeInTheDocument()
    })

    it('calls requestApproval on submit with valid justification', async () => {
      mockRequestApproval.mockResolvedValueOnce({})
      const user = userEvent.setup()
      render(<ApprovalDialog {...defaultProps} />)

      const textarea = screen.getByLabelText('Justification')
      await user.type(textarea, 'This is a justified reason')

      // Step 1: Click Review to go to confirmation step
      const reviewButton = screen.getByText('Review')
      await user.click(reviewButton)

      // Step 2: Click Submit for Approval on confirmation step
      const submitButton = screen.getByText('Submit for Approval')
      await user.click(submitButton)

      expect(mockRequestApproval).toHaveBeenCalledWith({
        requested_status: 'false_positive',
        justification: 'This is a justified reason',
      })
    })
  })

  // ============================================
  // STATUS LABELS
  // ============================================

  describe('status labels', () => {
    it('shows Resolved label for resolved status', () => {
      render(<ApprovalDialog {...defaultProps} targetStatus="resolved" />)

      expect(screen.getByText('Resolved')).toBeInTheDocument()
    })

    it('shows Accepted label for accepted status', () => {
      render(<ApprovalDialog {...defaultProps} targetStatus="accepted" />)

      expect(screen.getByText('Accepted')).toBeInTheDocument()
    })
  })
})
