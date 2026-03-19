/**
 * Risk Level Tests
 *
 * Tests for getRiskLevel with default and custom thresholds.
 */

import { describe, it, expect } from 'vitest'
import { getRiskLevel, DEFAULT_RISK_LEVELS } from '../types/common.types'
import type { RiskLevelThresholds } from '../types/common.types'

describe('getRiskLevel', () => {
  // ============================================
  // DEFAULT THRESHOLDS
  // ============================================

  describe('with default thresholds', () => {
    it('returns Critical for score >= 80', () => {
      expect(getRiskLevel(80).label).toBe('Critical')
      expect(getRiskLevel(100).label).toBe('Critical')
      expect(getRiskLevel(95).label).toBe('Critical')
    })

    it('returns High for score >= 60 and < 80', () => {
      expect(getRiskLevel(60).label).toBe('High')
      expect(getRiskLevel(79).label).toBe('High')
      expect(getRiskLevel(70).label).toBe('High')
    })

    it('returns Medium for score >= 40 and < 60', () => {
      expect(getRiskLevel(40).label).toBe('Medium')
      expect(getRiskLevel(59).label).toBe('Medium')
      expect(getRiskLevel(50).label).toBe('Medium')
    })

    it('returns Low for score >= 20 and < 40', () => {
      expect(getRiskLevel(20).label).toBe('Low')
      expect(getRiskLevel(39).label).toBe('Low')
      expect(getRiskLevel(30).label).toBe('Low')
    })

    it('returns Info for score < 20', () => {
      expect(getRiskLevel(0).label).toBe('Info')
      expect(getRiskLevel(19).label).toBe('Info')
      expect(getRiskLevel(10).label).toBe('Info')
    })

    it('returns correct colors', () => {
      expect(getRiskLevel(90).color).toBe('bg-red-500')
      expect(getRiskLevel(70).color).toBe('bg-orange-500')
      expect(getRiskLevel(50).color).toBe('bg-yellow-500')
      expect(getRiskLevel(30).color).toBe('bg-blue-500')
      expect(getRiskLevel(10).color).toBe('bg-green-500')
    })
  })

  // ============================================
  // CUSTOM THRESHOLDS
  // ============================================

  describe('with custom thresholds', () => {
    const customThresholds: RiskLevelThresholds = {
      critical_min: 90,
      high_min: 70,
      medium_min: 50,
      low_min: 30,
    }

    it('uses custom critical threshold', () => {
      expect(getRiskLevel(90, customThresholds).label).toBe('Critical')
      expect(getRiskLevel(89, customThresholds).label).toBe('High')
    })

    it('uses custom high threshold', () => {
      expect(getRiskLevel(70, customThresholds).label).toBe('High')
      expect(getRiskLevel(69, customThresholds).label).toBe('Medium')
    })

    it('uses custom medium threshold', () => {
      expect(getRiskLevel(50, customThresholds).label).toBe('Medium')
      expect(getRiskLevel(49, customThresholds).label).toBe('Low')
    })

    it('uses custom low threshold', () => {
      expect(getRiskLevel(30, customThresholds).label).toBe('Low')
      expect(getRiskLevel(29, customThresholds).label).toBe('Info')
    })

    it('returns Info below low threshold', () => {
      expect(getRiskLevel(0, customThresholds).label).toBe('Info')
      expect(getRiskLevel(15, customThresholds).label).toBe('Info')
    })
  })

  // ============================================
  // BACKWARD COMPATIBILITY
  // ============================================

  describe('backward compatibility', () => {
    it('works without thresholds parameter (undefined)', () => {
      const result = getRiskLevel(85)
      expect(result.label).toBe('Critical')
      expect(result.color).toBeDefined()
      expect(result.textColor).toBeDefined()
    })

    it('works with explicit undefined thresholds', () => {
      const result = getRiskLevel(85, undefined)
      expect(result.label).toBe('Critical')
    })
  })

  // ============================================
  // DEFAULT_RISK_LEVELS CONSTANT
  // ============================================

  describe('DEFAULT_RISK_LEVELS', () => {
    it('has expected default values', () => {
      expect(DEFAULT_RISK_LEVELS.critical_min).toBe(80)
      expect(DEFAULT_RISK_LEVELS.high_min).toBe(60)
      expect(DEFAULT_RISK_LEVELS.medium_min).toBe(40)
      expect(DEFAULT_RISK_LEVELS.low_min).toBe(20)
    })

    it('thresholds are properly ordered', () => {
      expect(DEFAULT_RISK_LEVELS.critical_min).toBeGreaterThan(DEFAULT_RISK_LEVELS.high_min)
      expect(DEFAULT_RISK_LEVELS.high_min).toBeGreaterThan(DEFAULT_RISK_LEVELS.medium_min)
      expect(DEFAULT_RISK_LEVELS.medium_min).toBeGreaterThan(DEFAULT_RISK_LEVELS.low_min)
      expect(DEFAULT_RISK_LEVELS.low_min).toBeGreaterThan(0)
    })
  })
})
