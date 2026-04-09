import { ImageResponse } from 'next/og'

/**
 * Dynamic favicon — Next.js 16 generates this at build time and serves
 * it at /icon. Replaces the static `favicon.ico` with a vector-rendered
 * version of the OpenCTEM mark so it stays crisp at every size.
 *
 * The mark is the chunky C with five notches + marker dot. At 32×32 the
 * notches are subtle but still visible; the marker dot uses bright teal
 * (#14B8A6) for visibility against the dark ink background.
 */

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
  return new ImageResponse(
    // ImageResponse expects JSX-as-CSS — we render a 32×32 box that
    // contains the mark SVG inline.
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0A1628',
        borderRadius: 7,
      }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 120 120"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="#FAFAF9"
        strokeWidth={16}
        strokeLinecap="butt"
      >
        {/* Canonical v3 mark — see docs/brand/mark-letterform.svg */}
        <path d="M 92.22 39.86 A 38 38 0 1 0 92.22 80.14" />
        <circle cx="98" cy="60" r="7" fill="#14B8A6" stroke="none" />
      </svg>
    </div>,
    {
      ...size,
    }
  )
}
