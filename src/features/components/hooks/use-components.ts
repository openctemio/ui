/**
 * Components Hooks
 *
 * High-level hooks that fetch API data and transform to UI types
 */

'use client'

import { useMemo } from 'react'
import { useComponentsApi, type ComponentApiFilters } from '../api'
import {
  transformApiComponents,
  calculateComponentStats,
  calculateEcosystemStats,
  calculateLicenseStats,
} from '../lib/transform-api'
import type { ComponentStats, ComponentEcosystem, LicenseRisk, LicenseCategory } from '../types'

interface UseComponentsOptions {
  filters?: ComponentApiFilters
  enabled?: boolean
}

/**
 * Fetch components with transformation to UI types
 */
export function useComponents(options?: UseComponentsOptions) {
  const { filters, enabled = true } = options || {}

  const { data, error, isLoading, isValidating, mutate } = useComponentsApi(
    enabled ? filters : undefined
  )

  const components = useMemo(() => {
    if (!data?.data) return []
    return transformApiComponents(data)
  }, [data])

  return {
    components,
    total: data?.total || 0,
    page: data?.page || 1,
    perPage: data?.per_page || 20,
    totalPages: data?.total_pages || 0,
    isLoading,
    isValidating,
    error,
    mutate,
  }
}

/**
 * Get component statistics from loaded components
 */
export function useComponentStats(options?: UseComponentsOptions) {
  const { components, isLoading, error } = useComponents({
    ...options,
    filters: {
      ...options?.filters,
      per_page: 1000, // Get all components for stats
    },
  })

  const stats = useMemo(() => {
    if (!components.length) {
      return {
        totalComponents: 0,
        directDependencies: 0,
        transitiveDependencies: 0,
        byEcosystem: {} as Record<ComponentEcosystem, number>,
        byType: {},
        totalVulnerabilities: 0,
        vulnerabilitiesBySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        componentsWithVulnerabilities: 0,
        componentsInCisaKev: 0,
        byLicenseRisk: {} as Record<LicenseRisk, number>,
        byLicenseCategory: {} as Record<LicenseCategory, number>,
        outdatedComponents: 0,
        averageRiskScore: 0,
      } as ComponentStats
    }
    return calculateComponentStats(components)
  }, [components])

  return {
    stats,
    isLoading,
    error,
  }
}

/**
 * Get vulnerable components
 */
export function useVulnerableComponents(options?: UseComponentsOptions) {
  const { components, isLoading, error, ...rest } = useComponents({
    ...options,
    filters: {
      ...options?.filters,
      has_vulnerabilities: true,
    },
  })

  const vulnerableComponents = useMemo(() => {
    return components.filter(
      (c) =>
        c.vulnerabilityCount.critical > 0 ||
        c.vulnerabilityCount.high > 0 ||
        c.vulnerabilityCount.medium > 0
    )
  }, [components])

  return {
    components: vulnerableComponents,
    isLoading,
    error,
    ...rest,
  }
}

/**
 * Get ecosystem statistics
 */
export function useEcosystemStats(options?: UseComponentsOptions) {
  const { components, isLoading, error } = useComponents({
    ...options,
    filters: {
      ...options?.filters,
      per_page: 1000,
    },
  })

  const ecosystemStats = useMemo(() => {
    if (!components.length) return []
    return calculateEcosystemStats(components)
  }, [components])

  return {
    ecosystemStats,
    isLoading,
    error,
  }
}

/**
 * Get license statistics
 */
export function useLicenseStats(options?: UseComponentsOptions) {
  const { components, isLoading, error } = useComponents({
    ...options,
    filters: {
      ...options?.filters,
      per_page: 1000,
    },
  })

  const licenseStats = useMemo(() => {
    if (!components.length) return []
    return calculateLicenseStats(components)
  }, [components])

  return {
    licenseStats,
    isLoading,
    error,
  }
}

/**
 * Combined hook for components overview page
 * Fetches all data in one request and derives stats
 */
export function useComponentsOverview() {
  const { components, isLoading, error, mutate } = useComponents({
    filters: { per_page: 1000 },
  })

  const stats = useMemo(() => {
    if (!components.length) {
      return {
        totalComponents: 0,
        directDependencies: 0,
        transitiveDependencies: 0,
        byEcosystem: {} as Record<ComponentEcosystem, number>,
        byType: {},
        totalVulnerabilities: 0,
        vulnerabilitiesBySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        componentsWithVulnerabilities: 0,
        componentsInCisaKev: 0,
        byLicenseRisk: {} as Record<LicenseRisk, number>,
        byLicenseCategory: {} as Record<LicenseCategory, number>,
        outdatedComponents: 0,
        averageRiskScore: 0,
      } as ComponentStats
    }
    return calculateComponentStats(components)
  }, [components])

  const vulnerableComponents = useMemo(() => {
    return components
      .filter(
        (c) =>
          c.vulnerabilityCount.critical > 0 ||
          c.vulnerabilityCount.high > 0 ||
          c.vulnerabilityCount.medium > 0
      )
      .sort((a, b) => b.riskScore - a.riskScore)
  }, [components])

  const ecosystemStats = useMemo(() => {
    if (!components.length) return []
    return calculateEcosystemStats(components)
  }, [components])

  const licenseStats = useMemo(() => {
    if (!components.length) return []
    return calculateLicenseStats(components)
  }, [components])

  return {
    components,
    stats,
    vulnerableComponents,
    ecosystemStats,
    licenseStats,
    isLoading,
    error,
    mutate,
  }
}
