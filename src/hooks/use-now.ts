'use client'

import { useEffect, useState } from 'react'

/**
 * The current time, re-read every `intervalMs` (default 5s), for values that
 * age on screen ("heartbeat 4s ago", a state that turns stale). Reading
 * Date.now() during render is impure; this keeps the clock in state so a
 * render is a function of its inputs, and the page still ticks.
 */
export function useNow(intervalMs = 5000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
