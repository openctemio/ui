/**
 * Dashboard Feature Barrel Export
 *
 * Main entry point for the dashboard feature
 * Provides convenient access to all dashboard-related functionality
 */

// ============================================
// COMPONENTS
// ============================================

export { ActivityItem, Analytics, AnalyticsChart, Overview, QuickStat, RecentSales } from './components'

// ============================================
// HOOKS
// ============================================

export { useDashboardStats, useRecentActivity } from './hooks/use-dashboard-stats'
export type { DashboardStats } from './hooks/use-dashboard-stats'
