'use client'

/**
 * Asset CSV export.
 *
 * The implementation is the generic `useCsvExport` hook in `@/hooks/use-csv-export`.
 * This module keeps the `useAssetExport` name (and re-exports the shared types)
 * so existing asset pages and tests have a stable import path. New, non-asset
 * call sites should import `useCsvExport` directly.
 */
import { useCsvExport, type ExportFieldConfig } from '@/hooks/use-csv-export'

export type { ExportFieldConfig }

export const useAssetExport = useCsvExport
