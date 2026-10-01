'use client'

/**
 * Lazy-loaded Recharts components
 *
 * These components dynamically import recharts to reduce initial bundle size.
 * Recharts is ~450KB uncompressed, so lazy loading improves initial page load.
 */

import { useEffect, useState, type ComponentProps } from 'react'
import dynamic from 'next/dynamic'
import {
  Area as RechartsArea,
  Bar as RechartsBar,
  Line as RechartsLine,
  Pie as RechartsPie,
} from 'recharts'
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

/**
 * Charts follow a width change once it settles: longer than the sidebar's 250ms
 * open/collapse so a toggle costs one chart render, short enough that a window
 * resize still feels live.
 */
const CHART_RESIZE_THROTTLE_MS = 300

const LazyResponsiveContainer = dynamic(
  () =>
    import('recharts').then((mod) => {
      // Wrap ResponsiveContainer with minWidth={0} to prevent
      // "width(-1) and height(-1) should be greater than 0" error
      // when the chart renders before its container is visible.
      //
      // debounce: resize at most once per CHART_RESIZE_THROTTLE_MS (trailing).
      // Without it every chart re-renders, and replays its draw animation, on
      // every frame the container width changes, e.g. the 250ms sidebar
      // open/collapse, which stalled the dashboard to a few frames.
      const Original = mod.ResponsiveContainer
      const Wrapped = (props: React.ComponentProps<typeof Original>) => (
        <Original minWidth={0} debounce={CHART_RESIZE_THROTTLE_MS} {...props} />
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
export { Cell, Legend, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'

/**
 * Series draw-in only when the chart first appears. Recharts otherwise replays
 * the draw animation (1.5s by default, a re-render per frame) whenever the
 * points move, which includes every resize: collapsing the sidebar made each
 * dashboard chart re-animate and stalled the page. After the first draw a
 * series updates in place. A caller can still pass isAnimationActive.
 */
const FIRST_DRAW_MS = 800

function useFirstDrawOnly(): boolean {
  const [animate, setAnimate] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setAnimate(false), FIRST_DRAW_MS + 100)
    return () => clearTimeout(t)
  }, [])
  return animate
}

function Area(props: ComponentProps<typeof RechartsArea>) {
  const animate = useFirstDrawOnly()
  return <RechartsArea isAnimationActive={animate} animationDuration={FIRST_DRAW_MS} {...props} />
}
function Bar(props: ComponentProps<typeof RechartsBar>) {
  const animate = useFirstDrawOnly()
  return <RechartsBar isAnimationActive={animate} animationDuration={FIRST_DRAW_MS} {...props} />
}
function Line(props: ComponentProps<typeof RechartsLine>) {
  const animate = useFirstDrawOnly()
  return <RechartsLine isAnimationActive={animate} animationDuration={FIRST_DRAW_MS} {...props} />
}
function Pie(props: ComponentProps<typeof RechartsPie>) {
  const animate = useFirstDrawOnly()
  return <RechartsPie isAnimationActive={animate} animationDuration={FIRST_DRAW_MS} {...props} />
}
Area.displayName = 'Area'
Bar.displayName = 'Bar'
Line.displayName = 'Line'
Pie.displayName = 'Pie'

export { Area, Bar, Line, Pie }
