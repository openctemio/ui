import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { toast } from 'sonner'
import { useAssetExport, type ExportFieldConfig } from '../use-asset-export'

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe('useAssetExport', () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>
  let revokeObjectURLMock: ReturnType<typeof vi.fn>
  let clickMock: ReturnType<typeof vi.fn>
  let anchorElement: { href: string; download: string; click: ReturnType<typeof vi.fn> }

  // Save original before any mocking
  const originalCreateElement = document.createElement.bind(document)

  // We need to spy on Blob to capture content
  let BlobSpy: ReturnType<typeof vi.fn>
  const originalBlob = global.Blob

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock URL methods
    createObjectURLMock = vi.fn(() => 'blob:http://localhost/fake-url')
    revokeObjectURLMock = vi.fn()
    global.URL.createObjectURL = createObjectURLMock as typeof URL.createObjectURL
    global.URL.revokeObjectURL = revokeObjectURLMock as typeof URL.revokeObjectURL

    // Mock document.createElement to capture the anchor click
    clickMock = vi.fn()
    anchorElement = { href: '', download: '', click: clickMock }

    vi.spyOn(document, 'createElement').mockImplementation(function (tag: string) {
      if (tag === 'a') {
        return anchorElement as unknown as HTMLAnchorElement
      }
      return originalCreateElement(tag)
    })

    // Mock Blob to capture CSV content - must use function() not arrow to be a constructor
    BlobSpy = vi.fn(function (this: Blob, parts: BlobPart[], options?: BlobPropertyBag) {
      return new originalBlob(parts, options)
    } as unknown as typeof Blob)
    global.Blob = BlobSpy as unknown as typeof Blob
  })

  afterEach(() => {
    vi.restoreAllMocks()
    global.Blob = originalBlob
  })

  // ============================================
  // Test data
  // ============================================
  interface TestItem {
    id: string
    name: string
    value: number
    description: string | null
  }

  const fields: ExportFieldConfig<TestItem>[] = [
    { header: 'ID', accessor: (item) => item.id },
    { header: 'Name', accessor: (item) => item.name },
    { header: 'Value', accessor: (item) => item.value },
  ]

  const sampleData: TestItem[] = [
    { id: '1', name: 'Alpha', value: 10, description: 'First' },
    { id: '2', name: 'Beta', value: 20, description: null },
  ]

  // Helper to get CSV content from the last Blob call
  function getCsvContent(): string {
    return BlobSpy.mock.calls[0][0][0] as string
  }

  // ============================================
  // CSV Sanitization (tested via export output)
  // ============================================
  describe('CSV sanitization (formula injection prevention)', () => {
    it('prefixes cells starting with = to prevent formula injection', () => {
      const data = [{ id: '1', name: '=CMD()', value: 0, description: null }]
      const { result } = renderHook(() => useAssetExport(data, fields, 'test'))

      act(() => {
        result.current.handleExport()
      })

      expect(getCsvContent()).toContain("'=CMD()")
    })

    it('prefixes cells starting with + to prevent formula injection', () => {
      const data = [{ id: '1', name: '+1234', value: 0, description: null }]
      const { result } = renderHook(() => useAssetExport(data, fields, 'test'))

      act(() => {
        result.current.handleExport()
      })

      expect(getCsvContent()).toContain("'+1234")
    })

    it('prefixes cells starting with - to prevent formula injection', () => {
      const data = [{ id: '1', name: '-1+1', value: 0, description: null }]
      const { result } = renderHook(() => useAssetExport(data, fields, 'test'))

      act(() => {
        result.current.handleExport()
      })

      expect(getCsvContent()).toContain("'-1+1")
    })

    it('prefixes cells starting with @ to prevent formula injection', () => {
      const data = [{ id: '1', name: '@SUM(A1)', value: 0, description: null }]
      const { result } = renderHook(() => useAssetExport(data, fields, 'test'))

      act(() => {
        result.current.handleExport()
      })

      expect(getCsvContent()).toContain("'@SUM(A1)")
    })

    it('prefixes cells starting with tab to prevent formula injection', () => {
      const data = [{ id: '1', name: '\tinjection', value: 0, description: null }]
      const { result } = renderHook(() => useAssetExport(data, fields, 'test'))

      act(() => {
        result.current.handleExport()
      })

      expect(getCsvContent()).toContain("'\tinjection")
    })

    it('prefixes cells starting with carriage return to prevent formula injection', () => {
      const data = [{ id: '1', name: '\rinjection', value: 0, description: null }]
      const { result } = renderHook(() => useAssetExport(data, fields, 'test'))

      act(() => {
        result.current.handleExport()
      })

      expect(getCsvContent()).toContain("'\rinjection")
    })

    it('wraps cells containing commas in double quotes', () => {
      const data = [{ id: '1', name: 'hello, world', value: 0, description: null }]
      const { result } = renderHook(() => useAssetExport(data, fields, 'test'))

      act(() => {
        result.current.handleExport()
      })

      expect(getCsvContent()).toContain('"hello, world"')
    })

    it('wraps cells containing double quotes and escapes them', () => {
      const data = [{ id: '1', name: 'say "hello"', value: 0, description: null }]
      const { result } = renderHook(() => useAssetExport(data, fields, 'test'))

      act(() => {
        result.current.handleExport()
      })

      expect(getCsvContent()).toContain('"say ""hello"""')
    })

    it('wraps cells containing newlines in double quotes', () => {
      const data = [{ id: '1', name: 'line1\nline2', value: 0, description: null }]
      const { result } = renderHook(() => useAssetExport(data, fields, 'test'))

      act(() => {
        result.current.handleExport()
      })

      expect(getCsvContent()).toContain('"line1\nline2"')
    })

    it('handles null values by converting to empty string', () => {
      const fieldsWithNull: ExportFieldConfig<TestItem>[] = [
        { header: 'Desc', accessor: (item) => item.description },
      ]
      const data = [{ id: '1', name: 'test', value: 0, description: null }]
      const { result } = renderHook(() => useAssetExport(data, fieldsWithNull, 'test'))

      act(() => {
        result.current.handleExport()
      })

      const lines = getCsvContent().replace('\uFEFF', '').split('\n')
      expect(lines[1]).toBe('')
    })

    it('handles undefined values by converting to empty string', () => {
      const fieldsWithUndefined: ExportFieldConfig<TestItem>[] = [
        { header: 'Missing', accessor: () => undefined },
      ]
      const data = [{ id: '1', name: 'test', value: 0, description: null }]
      const { result } = renderHook(() => useAssetExport(data, fieldsWithUndefined, 'test'))

      act(() => {
        result.current.handleExport()
      })

      const lines = getCsvContent().replace('\uFEFF', '').split('\n')
      expect(lines[1]).toBe('')
    })
  })

  // ============================================
  // CSV Generation
  // ============================================
  describe('handleExport - CSV generation', () => {
    it('generates correct CSV headers', () => {
      const { result } = renderHook(() => useAssetExport(sampleData, fields, 'test'))

      act(() => {
        result.current.handleExport()
      })

      const headerLine = getCsvContent().replace('\uFEFF', '').split('\n')[0]
      expect(headerLine).toBe('ID,Name,Value')
    })

    it('generates correct CSV rows using accessors', () => {
      const { result } = renderHook(() => useAssetExport(sampleData, fields, 'test'))

      act(() => {
        result.current.handleExport()
      })

      const lines = getCsvContent().replace('\uFEFF', '').split('\n')
      expect(lines[1]).toBe('1,Alpha,10')
      expect(lines[2]).toBe('2,Beta,20')
    })

    it('applies transform when provided', () => {
      const fieldsWithTransform: ExportFieldConfig<TestItem>[] = [
        { header: 'Name', accessor: (item) => item.name },
        {
          header: 'Value',
          accessor: (item) => item.value,
          transform: (v) => `$${v}`,
        },
      ]
      const { result } = renderHook(() => useAssetExport(sampleData, fieldsWithTransform, 'test'))

      act(() => {
        result.current.handleExport()
      })

      const lines = getCsvContent().replace('\uFEFF', '').split('\n')
      expect(lines[1]).toBe('Alpha,$10')
      expect(lines[2]).toBe('Beta,$20')
    })
  })

  // ============================================
  // Error handling
  // ============================================
  describe('handleExport - error handling', () => {
    it('shows error toast when data is empty', () => {
      const { result } = renderHook(() => useAssetExport([], fields, 'test'))

      act(() => {
        result.current.handleExport()
      })

      expect(toast.error).toHaveBeenCalledWith('No data to export')
      expect(createObjectURLMock).not.toHaveBeenCalled()
    })

    it('shows error toast when data is null-ish', () => {
      const { result } = renderHook(() =>
        useAssetExport(null as unknown as TestItem[], fields, 'test')
      )

      act(() => {
        result.current.handleExport()
      })

      expect(toast.error).toHaveBeenCalledWith('No data to export')
    })
  })

  // ============================================
  // Blob and download behavior
  // ============================================
  describe('handleExport - download behavior', () => {
    it('creates blob with BOM prefix for Excel compatibility', () => {
      const { result } = renderHook(() => useAssetExport(sampleData, fields, 'test'))

      act(() => {
        result.current.handleExport()
      })

      expect(getCsvContent().startsWith('\uFEFF')).toBe(true)
      expect(BlobSpy.mock.calls[0][1]).toEqual({ type: 'text/csv;charset=utf-8' })
    })

    it('calls URL.revokeObjectURL after download to prevent memory leak', () => {
      const { result } = renderHook(() => useAssetExport(sampleData, fields, 'test'))

      act(() => {
        result.current.handleExport()
      })

      expect(createObjectURLMock).toHaveBeenCalledTimes(1)
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/fake-url')
    })

    it('triggers download with correct filename including date', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-09T12:00:00Z'))

      const { result } = renderHook(() => useAssetExport(sampleData, fields, 'assets'))

      act(() => {
        result.current.handleExport()
      })

      expect(anchorElement.download).toBe('assets-2026-03-09.csv')

      vi.useRealTimers()
    })

    it('shows success toast after export', () => {
      const { result } = renderHook(() => useAssetExport(sampleData, fields, 'test'))

      act(() => {
        result.current.handleExport()
      })

      expect(toast.success).toHaveBeenCalledWith('Exported successfully')
    })
  })
})
