'use client'

/**
 * Lazy-loaded Recharts components
 *
 * These components dynamically import recharts to reduce initial bundle size.
 * Recharts is ~450KB uncompressed, so lazy loading improves initial page load.
 */

import dynamic from 'next/dynamic'
import { ChartSkeleton } from '@/components/ui/chart-skeleton'

// Lazy load the entire recharts library
const LazyAreaChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.AreaChart })),
  { loading: () => <ChartSkeleton type="area" />, ssr: false }
)

const LazyBarChart = dynamic(() => import('recharts').then((mod) => ({ default: mod.BarChart })), {
  loading: () => <ChartSkeleton type="bar" />,
  ssr: false,
})

const LazyPieChart = dynamic(() => import('recharts').then((mod) => ({ default: mod.PieChart })), {
  loading: () => <ChartSkeleton type="pie" />,
  ssr: false,
})

const LazyLineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  { loading: () => <ChartSkeleton type="line" />, ssr: false }
)

const LazyResponsiveContainer = dynamic(
  () =>
    import('recharts').then((mod) => {
      // Wrap ResponsiveContainer with minWidth={0} to prevent
      // "width(-1) and height(-1) should be greater than 0" error
      // when the chart renders before its container is visible.
      const Original = mod.ResponsiveContainer
      const Wrapped = (props: React.ComponentProps<typeof Original>) => (
        <Original minWidth={0} {...props} />
      )
      Wrapped.displayName = 'ResponsiveContainer'
      return { default: Wrapped }
    }),
  { ssr: false }
)

// Export static recharts components that don't need lazy loading
export {
  LazyAreaChart as AreaChart,
  LazyBarChart as BarChart,
  LazyPieChart as PieChart,
  LazyLineChart as LineChart,
  LazyResponsiveContainer as ResponsiveContainer,
}

// Re-export other recharts components directly (they're tree-shaken)
export { Area, Bar, Cell, Legend, Line, Pie, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
