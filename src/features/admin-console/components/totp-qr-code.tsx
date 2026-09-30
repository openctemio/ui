'use client'

import { useMemo } from 'react'
import { encode } from 'uqr'

interface TotpQrCodeProps {
  /** The otpauth:// URI returned by the API. */
  uri: string
  /** Rendered size in pixels. */
  size?: number
}

/**
 * QR code for authenticator-app enrollment. uqr only computes the module
 * matrix; the SVG is built here from <rect>s (no innerHTML), on a fixed white
 * ground so it scans in dark mode too.
 */
export function TotpQrCode({ uri, size = 192 }: TotpQrCodeProps) {
  const qr = useMemo(() => encode(uri, { border: 2 }), [uri])
  const n = qr.size

  const modules = useMemo(() => {
    const rects: { x: number; y: number }[] = []
    qr.data.forEach((row, y) =>
      row.forEach((on, x) => {
        if (on) rects.push({ x, y })
      })
    )
    return rects
  }, [qr])

  return (
    <svg
      role="img"
      aria-label="QR code for your authenticator app"
      width={size}
      height={size}
      viewBox={`0 0 ${n} ${n}`}
      shapeRendering="crispEdges"
      className="rounded-md border"
    >
      {/* palette-ok: a QR code needs a fixed light ground and dark modules in both themes to scan */}
      <rect width={n} height={n} fill="#ffffff" />
      {modules.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#000000" />
      ))}
    </svg>
  )
}
