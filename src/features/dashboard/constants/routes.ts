/**
 * Dashboard Routes Constants
 *
 * Centralized dashboard-related routes
 */

export const DASHBOARD_ROUTES = {
  /**
   * Dashboard home
   */
  HOME: '/',

  /**
   * Overview tab
   */
  OVERVIEW: '/dashboard/overview',

  /**
   * Analytics tab
   */
  ANALYTICS: '/dashboard/analytics',

  /**
   * Customers (disabled)
   */
  CUSTOMERS: '/dashboard/customers',

  /**
   * Products (disabled)
   */
  PRODUCTS: '/dashboard/products',

  /**
   * Settings (disabled)
   */
  SETTINGS: '/dashboard/settings',
} as const

/**
 * Dashboard tab IDs
 */
export const DASHBOARD_TABS = {
  OVERVIEW: 'overview',
  ANALYTICS: 'analytics',
  REPORTS: 'reports',
  NOTIFICATIONS: 'notifications',
} as const

/**
 * Default active tab
 */
export const DEFAULT_TAB = DASHBOARD_TABS.OVERVIEW
