import { ImageResponse } from 'next/og'

/**
 * Apple touch icon for iOS PWA / "Add to Home Screen". Same mark as
 * favicon but at 180×180 with a larger radius (matching iOS aesthetic).
 */

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0A1628',
        // iOS will mask this with a rounded square — full bleed background
      }}
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="#FAFAF9"
        strokeWidth={16}
        strokeLinecap="butt"
      >
        <path d="M 92.22 39.86 A 38 38 0 1 0 92.22 80.14" />
        <circle cx="98" cy="60" r="7" fill="#14B8A6" stroke="none" />
      </svg>
    </div>,
    {
      ...size,
    }
  )
}
