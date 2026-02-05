/**
 * Scope Feature - Barrel Export
 *
 * Provides shared scope management types, utilities, and components
 * that link Scope Config with Assets Inventory.
 */

// Types
export * from "./types";

// API Types and Hooks
export * from "./api";

// Utilities
export * from "./lib/scope-matcher";

// Mock Data (for development)
export * from "./lib/mock-scope-data";

// Components
export { ScopeBadge, ScopeBadgeSimple } from "./components/scope-badge";
export { ScopeCoverageCard, ScopeCoverageInline } from "./components/scope-coverage-card";
export {
  ScopeErrorBoundary,
  ScopeBadgeErrorBoundary,
  withScopeErrorBoundary,
} from "./components/scope-error-boundary";
