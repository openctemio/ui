'use client'

import { cn } from '@/lib/utils'

interface SparklineProps {
  values: number[]
  className?: string
  /** Accessible label for the series. */
  label?: string
  width?: number
  height?: number
}

/**
 * Dependency-free inline-SVG sparkline. Recharts is available but is
 * lazy/SSR-fussy and awkward to assert on in jsdom; for a small
 * per-metric series a pure-SVG polyline is lighter, deterministic and
 * theme-aware (it inherits `currentColor`).
 */
export function Sparkline({ values, className, label, width = 120, height = 32 }: SparklineProps) {
  if (values.length === 0) {
    return <span className="text-muted-foreground text-xs">No data</span>
  }

  const pad = 2
  const w = width
  const h = height
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0

  const points = values.map((v, i) => {
    const x = pad + i * stepX
    // Invert Y (SVG origin top-left); flat series sits mid-height.
    const y = max === min ? h / 2 : pad + (h - pad * 2) * (1 - (v - min) / span)
    return { x, y }
  })

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
  const last = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className={cn('text-primary overflow-visible', className)}
      role="img"
      aria-label={label ? `${label} trend` : 'trend'}
      preserveAspectRatio="none"
    >
      {points.length === 1 ? (
        <circle cx={points[0].x} cy={points[0].y} r={2.5} fill="currentColor" />
      ) : (
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <circle cx={last.x} cy={last.y} r={2} fill="currentColor" />
    </svg>
  )
}
