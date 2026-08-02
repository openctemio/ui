'use client'

import { useEffect, useState } from 'react'
import { Maximize, Minimize } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Header button that toggles browser full-screen via the Fullscreen API.
 * Hides browser chrome (URL/tab bar) for an immersive dashboard.
 *
 * Renders nothing where the Fullscreen API isn't available (e.g. iOS Safari,
 * which doesn't expose it for arbitrary elements) so there's no dead button.
 */
export function FullscreenToggle() {
  const [supported, setSupported] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    setSupported(Boolean(document.fullscreenEnabled))
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  if (!supported) return null

  const toggle = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.()
    } else {
      void document.documentElement.requestFullscreen?.()
    }
  }

  const Icon = isFullscreen ? Minimize : Maximize
  const label = isFullscreen ? 'Exit full screen' : 'Full screen'

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative scale-95 rounded-full"
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      <Icon className="size-[1.2rem]" />
      <span className="sr-only">{label}</span>
    </Button>
  )
}
