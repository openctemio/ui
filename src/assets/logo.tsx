import { type SVGProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * OpenCTEM mark — letterform direction (the chunky C with five notches).
 *
 * The mark is a stylised lowercase "c" built from five distinct arc segments,
 * one per CTEM stage (Scoping, Discovery, Prioritization, Validation,
 * Mobilization). The opening of the C contains a marker dot — the only
 * element that takes the accent colour.
 *
 * Design rationale and alternative directions are documented in
 * `docs/brand/README.md`. The geometry is locked: edit the SVG file there,
 * not this component.
 *
 * Behaviour:
 *   - Uses `currentColor` for all strokes, so it inherits whatever text
 *     colour the parent sets. Drop it into a dark sidebar, a light header,
 *     a print stylesheet — it just works.
 *   - The marker dot defaults to teal-600 (`#0D9488`) but accepts a
 *     `markerColor` prop for special contexts (e.g. brighter teal on dark).
 *   - Default size matches shadcn/ui icons (`size-6` = 24px).
 */
interface LogoProps extends SVGProps<SVGSVGElement> {
  /** Accent colour for the marker dot. Defaults to teal-600. */
  markerColor?: string
}

export function Logo({ className, markerColor = '#0D9488', ...props }: LogoProps) {
  // Canonical mark — exact spec from docs/brand/mark-letterform.svg.
  // Single smooth arc, 64° opening on the right, butt linecaps, marker
  // dot inside the opening. Do NOT modify this geometry without also
  // updating the brand asset; they are intentionally identical.
  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="16"
      strokeLinecap="butt"
      className={cn('size-6', className)}
      role="img"
      aria-label="OpenCTEM"
      {...props}
    >
      <path d="M 92.22 39.86 A 38 38 0 1 0 92.22 80.14" />
      <circle cx="98" cy="60" r="7" fill={markerColor} stroke="none" />
    </svg>
  )
}

/**
 * OpenCTEM full logo — mark + wordmark on one line.
 *
 * The C in `openctem` IS the mark. Removing the C breaks the wordmark;
 * removing the wordmark leaves a recognisable brand letter. This is the
 * strongest possible coupling between mark and name.
 *
 * Use this in headers, login screens, marketing pages — anywhere you'd
 * historically put a horizontal logo lockup. For sidebar collapsed state
 * or favicon contexts, use `<Logo />` (mark only).
 */
export function LogoFull({ className, markerColor = '#0D9488', ...props }: LogoProps) {
  // Inline letterform lockup: open + chunky C + tem, all on one baseline.
  //
  // The C sits between "open" and "tem" as a custom letter glyph at the
  // same cap-height as the surrounding text. The marker dot inside the C
  // opening is the only accent-coloured element.
  //
  // Geometry budget (viewBox 295×88, all in viewBox units):
  //   x=4    "open" left edge       (fontSize 56, text width ≈ 119)
  //   x=123  end of "open"
  //   x=129  visual left of C body  (6 unit gap)
  //   x=193  visual right of C body (C body width ≈ 64 at scale 0.70)
  //   x=199  start of "tem"         (6 unit gap)
  //   x=292  end of "tem"           (text width ≈ 93)
  return (
    <svg
      viewBox="0 0 295 88"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-7 w-auto', className)}
      role="img"
      aria-label="OpenCTEM"
      {...props}
    >
      {/* "open" — left of the C */}
      <text
        x="4"
        y="66"
        fontFamily="-apple-system, system-ui, 'Segoe UI', Inter, sans-serif"
        fontSize="56"
        fontWeight="700"
        letterSpacing="-2.5"
        fill="currentColor"
      >
        open
      </text>

      {/*
        The chunky C — single smooth arc with butt caps. Same geometry
        as <Logo /> scaled to 0.70 so its body height matches the text
        cap-height. Exact spec from docs/brand/logo-letterform.svg.
      */}
      <g
        transform="translate(119 16) scale(0.70)"
        fill="none"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="butt"
      >
        <path d="M 92.22 39.86 A 38 38 0 1 0 92.22 80.14" />
        <circle cx="98" cy="60" r="7" fill={markerColor} stroke="none" />
      </g>

      {/* "tem" — right of the C */}
      <text
        x="199"
        y="66"
        fontFamily="-apple-system, system-ui, 'Segoe UI', Inter, sans-serif"
        fontSize="56"
        fontWeight="700"
        letterSpacing="-2.5"
        fill="currentColor"
      >
        tem
      </text>
    </svg>
  )
}
