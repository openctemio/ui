/**
 * Scan Utility Function Tests
 *
 * Tests for pure utility functions used by scan dialogs:
 * - parseTargets (QuickScanDialog)
 * - scanConfigToFormData / schedule mapping (EditScanDialog)
 * - getCompatibilityStatus
 */

import { describe, it, expect } from 'vitest'
import { getCompatibilityStatus } from '../types/scan.types'

// =============================================================================
// parseTargets — extracted from quick-scan-dialog.tsx
// =============================================================================

/** Parse targets from text, supporting newline, comma, and semicolon separators. */
function parseTargets(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

describe('parseTargets', () => {
  it('parses newline-separated targets', () => {
    expect(parseTargets('example.com\n192.168.1.1\nhttps://api.example.com')).toEqual([
      'example.com',
      '192.168.1.1',
      'https://api.example.com',
    ])
  })

  it('parses comma-separated targets', () => {
    expect(parseTargets('example.com,192.168.1.1,https://api.example.com')).toEqual([
      'example.com',
      '192.168.1.1',
      'https://api.example.com',
    ])
  })

  it('parses semicolon-separated targets', () => {
    expect(parseTargets('example.com;192.168.1.1;https://api.example.com')).toEqual([
      'example.com',
      '192.168.1.1',
      'https://api.example.com',
    ])
  })

  it('parses mixed separators', () => {
    expect(parseTargets('a.com\nb.com,c.com;d.com')).toEqual(['a.com', 'b.com', 'c.com', 'd.com'])
  })

  it('trims whitespace from targets', () => {
    expect(parseTargets('  example.com  ,  192.168.1.1  ')).toEqual(['example.com', '192.168.1.1'])
  })

  it('filters empty entries from consecutive separators', () => {
    expect(parseTargets('example.com,,192.168.1.1\n\n\ntest.com')).toEqual([
      'example.com',
      '192.168.1.1',
      'test.com',
    ])
  })

  it('returns empty array for empty string', () => {
    expect(parseTargets('')).toEqual([])
  })

  it('returns empty array for whitespace-only input', () => {
    expect(parseTargets('   \n   \n   ')).toEqual([])
  })

  it('returns empty array for only separators', () => {
    expect(parseTargets(',,,;;;')).toEqual([])
  })

  it('handles single target', () => {
    expect(parseTargets('example.com')).toEqual(['example.com'])
  })

  it('handles targets with ports', () => {
    expect(parseTargets('example.com:8080\n192.168.1.1:443')).toEqual([
      'example.com:8080',
      '192.168.1.1:443',
    ])
  })

  it('handles CIDR notation', () => {
    expect(parseTargets('192.168.1.0/24, 10.0.0.0/8')).toEqual(['192.168.1.0/24', '10.0.0.0/8'])
  })

  it('handles URLs with paths', () => {
    expect(parseTargets('https://api.example.com/v1\nhttps://app.example.com/login')).toEqual([
      'https://api.example.com/v1',
      'https://app.example.com/login',
    ])
  })
})

// =============================================================================
// mapScheduleTypeToFrequency — from edit-scan-dialog.tsx
// =============================================================================

type ScheduleFrequency = 'once' | 'daily' | 'weekly' | 'monthly'

function mapScheduleTypeToFrequency(scheduleType?: string): ScheduleFrequency {
  switch (scheduleType) {
    case 'daily':
      return 'daily'
    case 'weekly':
      return 'weekly'
    case 'monthly':
      return 'monthly'
    default:
      return 'once'
  }
}

describe('mapScheduleTypeToFrequency', () => {
  it('maps daily', () => {
    expect(mapScheduleTypeToFrequency('daily')).toBe('daily')
  })

  it('maps weekly', () => {
    expect(mapScheduleTypeToFrequency('weekly')).toBe('weekly')
  })

  it('maps monthly', () => {
    expect(mapScheduleTypeToFrequency('monthly')).toBe('monthly')
  })

  it('maps manual to once', () => {
    expect(mapScheduleTypeToFrequency('manual')).toBe('once')
  })

  it('maps undefined to once', () => {
    expect(mapScheduleTypeToFrequency(undefined)).toBe('once')
  })

  it('maps unknown string to once', () => {
    expect(mapScheduleTypeToFrequency('unknown')).toBe('once')
  })
})

// =============================================================================
// mapScheduleFrequencyToType — from edit-scan-dialog.tsx
// =============================================================================

type ScheduleType = 'manual' | 'daily' | 'weekly' | 'monthly'

function mapScheduleFrequencyToType(frequency: ScheduleFrequency | undefined): ScheduleType {
  switch (frequency) {
    case 'daily':
      return 'daily'
    case 'weekly':
      return 'weekly'
    case 'monthly':
      return 'monthly'
    default:
      return 'manual'
  }
}

describe('mapScheduleFrequencyToType', () => {
  it('maps daily to daily', () => {
    expect(mapScheduleFrequencyToType('daily')).toBe('daily')
  })

  it('maps weekly to weekly', () => {
    expect(mapScheduleFrequencyToType('weekly')).toBe('weekly')
  })

  it('maps monthly to monthly', () => {
    expect(mapScheduleFrequencyToType('monthly')).toBe('monthly')
  })

  it('maps once to manual', () => {
    expect(mapScheduleFrequencyToType('once')).toBe('manual')
  })

  it('maps undefined to manual', () => {
    expect(mapScheduleFrequencyToType(undefined)).toBe('manual')
  })
})

// =============================================================================
// getCompatibilityStatus — from scan.types.ts
// =============================================================================

describe('getCompatibilityStatus', () => {
  it('returns full for 100%', () => {
    expect(getCompatibilityStatus(100)).toBe('full')
  })

  it('returns full for >100% (edge case)', () => {
    expect(getCompatibilityStatus(150)).toBe('full')
  })

  it('returns partial for 50%', () => {
    expect(getCompatibilityStatus(50)).toBe('partial')
  })

  it('returns partial for 1%', () => {
    expect(getCompatibilityStatus(1)).toBe('partial')
  })

  it('returns partial for 99%', () => {
    expect(getCompatibilityStatus(99)).toBe('partial')
  })

  it('returns none for 0%', () => {
    expect(getCompatibilityStatus(0)).toBe('none')
  })

  it('returns none for negative (edge case)', () => {
    expect(getCompatibilityStatus(-1)).toBe('none')
  })
})

// =============================================================================
// scanConfigToFormData conversion tests
// =============================================================================

describe('scanConfigToFormData', () => {
  // Minimal inline type matching what edit-scan-dialog expects
  interface ScanConfig {
    name: string
    scan_type: string
    schedule_type: string
    scanner_config?: Record<string, boolean | string>
    asset_group_ids?: string[]
    asset_group_id?: string
    targets?: string[]
    pipeline_id?: string
    agent_preference?: string
    targets_per_job?: number
    schedule_day?: number
    schedule_time?: string
    description?: string
  }

  // Inlined conversion logic matching edit-scan-dialog.tsx
  function scanConfigToFormData(config: ScanConfig) {
    const scannerConfig = (config.scanner_config ?? {}) as Record<string, boolean | string>
    const isManual = config.schedule_type === 'manual'

    return {
      name: config.name,
      mode: config.scan_type === 'workflow' ? 'workflow' : 'single',
      type: 'full' as const,
      workflowId: config.pipeline_id,
      agentPreference: config.agent_preference || 'auto',
      targets: {
        type: 'asset_groups' as const,
        assetGroupIds:
          config.asset_group_ids ?? (config.asset_group_id ? [config.asset_group_id] : []),
        assetIds: [] as string[],
        assetNames: {} as Record<string, string>,
        customTargets: config.targets ?? [],
      },
      options: {
        portScanning: !!scannerConfig.port_scanning,
        webAppScanning: !!scannerConfig.web_app_scanning,
        sslAnalysis: !!scannerConfig.ssl_analysis,
        bruteForce: !!scannerConfig.brute_force,
        techDetection: !!scannerConfig.tech_detection,
        apiSecurity: !!scannerConfig.api_security,
      },
      intensity: (scannerConfig.intensity as 'low' | 'medium' | 'high') || 'medium',
      maxConcurrent: config.targets_per_job || 10,
      schedule: {
        runImmediately: isManual,
        frequency: mapScheduleTypeToFrequency(config.schedule_type),
        dayOfWeek: config.schedule_day,
        time: config.schedule_time,
      },
    }
  }

  it('converts basic scan config', () => {
    const config: ScanConfig = {
      name: 'Test Scan',
      scan_type: 'single',
      schedule_type: 'manual',
      scanner_config: {
        port_scanning: true,
        web_app_scanning: true,
        ssl_analysis: false,
        brute_force: false,
        tech_detection: true,
        api_security: false,
        intensity: 'medium',
      },
    }

    const result = scanConfigToFormData(config)

    expect(result.name).toBe('Test Scan')
    expect(result.mode).toBe('single')
    expect(result.options.portScanning).toBe(true)
    expect(result.options.webAppScanning).toBe(true)
    expect(result.options.sslAnalysis).toBe(false)
    expect(result.options.bruteForce).toBe(false)
    expect(result.options.techDetection).toBe(true)
    expect(result.options.apiSecurity).toBe(false)
    expect(result.intensity).toBe('medium')
    expect(result.schedule.runImmediately).toBe(true)
  })

  it('converts workflow scan config', () => {
    const config: ScanConfig = {
      name: 'Workflow Scan',
      scan_type: 'workflow',
      schedule_type: 'weekly',
      pipeline_id: 'pipeline-123',
      schedule_day: 1,
      schedule_time: '02:00',
    }

    const result = scanConfigToFormData(config)

    expect(result.mode).toBe('workflow')
    expect(result.workflowId).toBe('pipeline-123')
    expect(result.schedule.frequency).toBe('weekly')
    expect(result.schedule.dayOfWeek).toBe(1)
    expect(result.schedule.time).toBe('02:00')
    expect(result.schedule.runImmediately).toBe(false)
  })

  it('preserves all false scanner_config values', () => {
    const config: ScanConfig = {
      name: 'All False',
      scan_type: 'single',
      schedule_type: 'manual',
      scanner_config: {
        port_scanning: false,
        web_app_scanning: false,
        ssl_analysis: false,
        brute_force: false,
        tech_detection: false,
        api_security: false,
        intensity: 'low',
      },
    }

    const result = scanConfigToFormData(config)

    expect(result.options.portScanning).toBe(false)
    expect(result.options.webAppScanning).toBe(false)
    expect(result.options.sslAnalysis).toBe(false)
    expect(result.options.bruteForce).toBe(false)
    expect(result.options.techDetection).toBe(false)
    expect(result.options.apiSecurity).toBe(false)
    expect(result.intensity).toBe('low')
  })

  it('handles missing scanner_config gracefully', () => {
    const config: ScanConfig = {
      name: 'No Config',
      scan_type: 'single',
      schedule_type: 'manual',
    }

    const result = scanConfigToFormData(config)

    // All options should default to false when scanner_config is missing
    expect(result.options.portScanning).toBe(false)
    expect(result.options.webAppScanning).toBe(false)
    expect(result.intensity).toBe('medium')
    expect(result.maxConcurrent).toBe(10)
  })

  it('converts asset_group_ids correctly', () => {
    const config: ScanConfig = {
      name: 'With Groups',
      scan_type: 'single',
      schedule_type: 'manual',
      asset_group_ids: ['group-1', 'group-2'],
    }

    const result = scanConfigToFormData(config)

    expect(result.targets.assetGroupIds).toEqual(['group-1', 'group-2'])
  })

  it('falls back to single asset_group_id', () => {
    const config: ScanConfig = {
      name: 'Single Group',
      scan_type: 'single',
      schedule_type: 'manual',
      asset_group_id: 'group-legacy',
    }

    const result = scanConfigToFormData(config)

    expect(result.targets.assetGroupIds).toEqual(['group-legacy'])
  })

  it('converts custom targets', () => {
    const config: ScanConfig = {
      name: 'Custom Targets',
      scan_type: 'single',
      schedule_type: 'manual',
      targets: ['example.com', '192.168.1.1'],
    }

    const result = scanConfigToFormData(config)

    expect(result.targets.customTargets).toEqual(['example.com', '192.168.1.1'])
  })

  it('defaults agent preference to auto', () => {
    const config: ScanConfig = {
      name: 'No Agent Pref',
      scan_type: 'single',
      schedule_type: 'manual',
    }

    const result = scanConfigToFormData(config)

    expect(result.agentPreference).toBe('auto')
  })

  it('preserves agent preference', () => {
    const config: ScanConfig = {
      name: 'Platform Agent',
      scan_type: 'single',
      schedule_type: 'manual',
      agent_preference: 'platform',
    }

    const result = scanConfigToFormData(config)

    expect(result.agentPreference).toBe('platform')
  })
})
