/**
 * CompatibilityWarning Tests
 *
 * Tests for the scan-asset compatibility warning component:
 * - Renders nothing when no data / no identifiers
 * - Shows warning banner when some assets are incompatible
 * - Shows fully-compatible success message
 * - Expandable/collapsible details section
 * - Shows counts (total, compatible, skipped)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompatibilityWarning } from '../compatibility-warning'

// ============================================
// MOCKS
// ============================================

// Track the SWR key and return controlled responses
const mockSWRData = {
  data: undefined as unknown,
  error: undefined as unknown,
  isLoading: false,
}

vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: mockSWRData.data,
    error: mockSWRData.error,
    isLoading: mockSWRData.isLoading,
    mutate: vi.fn(),
  })),
}))

vi.mock('@/lib/api/client', () => ({
  fetcher: vi.fn(),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/features/assets/types/asset.types', () => ({
  ASSET_TYPE_LABELS: {
    domain: 'Domain',
    ip_address: 'IP Address',
    website: 'Website',
    cloud_resource: 'Cloud Resource',
    certificate: 'Certificate',
  },
}))

// ============================================
// SETUP
// ============================================

describe('CompatibilityWarning', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSWRData.data = undefined
    mockSWRData.error = undefined
    mockSWRData.isLoading = false
  })

  // ============================================
  // NO DATA / NO IDENTIFIERS
  // ============================================

  describe('no data / no identifiers', () => {
    it('renders nothing when no scanId or assetGroupId is provided', () => {
      const { container } = render(<CompatibilityWarning />)

      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when API returns error', () => {
      mockSWRData.error = new Error('API error')

      const { container } = render(<CompatibilityWarning scanId="scan-1" />)

      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when API returns no data and no error', () => {
      mockSWRData.data = undefined
      mockSWRData.error = undefined

      const { container } = render(<CompatibilityWarning scanId="scan-1" />)

      expect(container.firstChild).toBeNull()
    })
  })

  // ============================================
  // LOADING STATE
  // ============================================

  describe('loading state', () => {
    it('shows loading message while fetching', () => {
      mockSWRData.isLoading = true

      render(<CompatibilityWarning scanId="scan-1" />)

      expect(screen.getByText('Checking compatibility...')).toBeInTheDocument()
    })

    it('shows tool name in loading message when provided', () => {
      mockSWRData.isLoading = true

      render(<CompatibilityWarning scanId="scan-1" toolName="Nmap" />)

      expect(screen.getByText(/Nmap/)).toBeInTheDocument()
    })
  })

  // ============================================
  // FULLY COMPATIBLE
  // ============================================

  describe('fully compatible', () => {
    it('shows success message when all assets are compatible', () => {
      mockSWRData.data = {
        total_assets: 10,
        compatible_assets: 10,
        skipped_assets: 0,
        compatibility_percent: 100,
        tool_name: 'Nmap',
        asset_type_details: [],
      }

      render(<CompatibilityWarning scanId="scan-1" />)

      expect(screen.getByText('All assets compatible')).toBeInTheDocument()
      expect(screen.getByText(/All 10 assets can be scanned by Nmap/)).toBeInTheDocument()
    })

    it('handles singular asset count', () => {
      mockSWRData.data = {
        total_assets: 1,
        compatible_assets: 1,
        skipped_assets: 0,
        compatibility_percent: 100,
        tool_name: 'Nmap',
        asset_type_details: [],
      }

      render(<CompatibilityWarning scanId="scan-1" />)

      expect(screen.getByText(/All 1 asset can be scanned/)).toBeInTheDocument()
    })
  })

  // ============================================
  // PARTIAL COMPATIBILITY (WARNING)
  // ============================================

  describe('partial compatibility', () => {
    const partialData = {
      total_assets: 20,
      compatible_assets: 15,
      skipped_assets: 5,
      compatibility_percent: 75,
      tool_name: 'Nuclei',
      supported_targets: ['domain', 'website'],
      asset_type_details: [
        { asset_type: 'domain', count: 10, is_compatible: true },
        { asset_type: 'website', count: 5, is_compatible: true },
        {
          asset_type: 'ip_address',
          count: 3,
          is_compatible: false,
          skip_reason: 'Not supported by Nuclei',
        },
        {
          asset_type: 'cloud_resource',
          count: 2,
          is_compatible: false,
          skip_reason: 'Incompatible asset type',
        },
      ],
    }

    it('shows warning banner with skip count', () => {
      mockSWRData.data = partialData

      render(<CompatibilityWarning scanId="scan-1" />)

      expect(screen.getByText('5 of 20 assets will be skipped')).toBeInTheDocument()
    })

    it('shows count badges', () => {
      mockSWRData.data = partialData

      render(<CompatibilityWarning scanId="scan-1" />)

      expect(screen.getByText('15 compatible')).toBeInTheDocument()
      expect(screen.getByText('5 skipped')).toBeInTheDocument()
    })

    it('shows supported targets when available', () => {
      mockSWRData.data = partialData

      render(<CompatibilityWarning scanId="scan-1" />)

      expect(screen.getByText('Supported targets:')).toBeInTheDocument()
      expect(screen.getByText('Domain')).toBeInTheDocument()
      expect(screen.getByText('Website')).toBeInTheDocument()
    })
  })

  // ============================================
  // NO COMPATIBLE ASSETS (DESTRUCTIVE)
  // ============================================

  describe('no compatible assets', () => {
    it('shows destructive message when no assets are compatible', () => {
      mockSWRData.data = {
        total_assets: 10,
        compatible_assets: 0,
        skipped_assets: 10,
        compatibility_percent: 0,
        tool_name: 'SpecialScanner',
        asset_type_details: [
          {
            asset_type: 'ip_address',
            count: 10,
            is_compatible: false,
            skip_reason: 'Not supported',
          },
        ],
      }

      render(<CompatibilityWarning scanId="scan-1" />)

      expect(screen.getByText('No compatible assets')).toBeInTheDocument()
    })
  })

  // ============================================
  // EXPANDABLE DETAILS
  // ============================================

  describe('expandable details', () => {
    const detailedData = {
      total_assets: 20,
      compatible_assets: 15,
      skipped_assets: 5,
      compatibility_percent: 75,
      tool_name: 'Nuclei',
      asset_type_details: [
        { asset_type: 'domain', count: 10, is_compatible: true },
        { asset_type: 'website', count: 5, is_compatible: true },
        { asset_type: 'ip_address', count: 3, is_compatible: false, skip_reason: 'Not supported' },
        {
          asset_type: 'cloud_resource',
          count: 2,
          is_compatible: false,
          skip_reason: 'Incompatible',
        },
      ],
    }

    it('shows the "Show details" button', () => {
      mockSWRData.data = detailedData

      render(<CompatibilityWarning scanId="scan-1" />)

      expect(screen.getByText(/Show details by asset type/)).toBeInTheDocument()
    })

    it('toggles details when clicked', async () => {
      mockSWRData.data = detailedData
      const user = userEvent.setup()

      render(<CompatibilityWarning scanId="scan-1" />)

      const toggleButton = screen.getByText(/Show details by asset type/)
      await user.click(toggleButton)

      // After clicking, should show "Hide details"
      expect(screen.getByText(/Hide details by asset type/)).toBeInTheDocument()
    })

    it('shows detail table with asset types when expanded', async () => {
      mockSWRData.data = detailedData
      const user = userEvent.setup()

      render(<CompatibilityWarning scanId="scan-1" />)

      const toggleButton = screen.getByText(/Show details by asset type/)
      await user.click(toggleButton)

      // Should show asset type names from labels
      expect(screen.getByText('Domain')).toBeInTheDocument()
      expect(screen.getByText('IP Address')).toBeInTheDocument()

      // Should show status badges
      const scannedBadges = screen.getAllByText('Scanned')
      expect(scannedBadges.length).toBeGreaterThanOrEqual(1)

      const skippedBadges = screen.getAllByText('Skipped')
      expect(skippedBadges.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================
  // TOOL NAME DISPLAY
  // ============================================

  describe('tool name display', () => {
    it('uses prop toolName over API tool_name', () => {
      mockSWRData.data = {
        total_assets: 10,
        compatible_assets: 10,
        skipped_assets: 0,
        compatibility_percent: 100,
        tool_name: 'API Tool',
        asset_type_details: [],
      }

      render(<CompatibilityWarning scanId="scan-1" toolName="Prop Tool" />)

      expect(screen.getByText(/Prop Tool/)).toBeInTheDocument()
    })

    it('falls back to API tool_name when prop not provided', () => {
      mockSWRData.data = {
        total_assets: 10,
        compatible_assets: 10,
        skipped_assets: 0,
        compatibility_percent: 100,
        tool_name: 'API Tool',
        asset_type_details: [],
      }

      render(<CompatibilityWarning scanId="scan-1" />)

      expect(screen.getByText(/API Tool/)).toBeInTheDocument()
    })
  })
})
