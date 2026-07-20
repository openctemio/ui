/**
 * Lightweight cron humanizer for the 5-field standard cron the backend parses
 * (minute hour dom month dow — see reportschedule.cronParser). There is no
 * existing cron helper in the codebase, and pulling in `cronstrue` would add a
 * dependency for one label, so this covers the common cadences the presets
 * produce and falls back to the raw expression for anything custom.
 */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function pad(n: string): string {
  return n.padStart(2, '0')
}

/** Format `hour minute` cron fields as HH:MM, or null if not a fixed time. */
function fixedTime(minute: string, hour: string): string | null {
  if (!/^\d+$/.test(minute) || !/^\d+$/.test(hour)) return null
  return `${pad(hour)}:${pad(minute)}`
}

export function humanizeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return expr
  const [minute, hour, dom, month, dow] = parts

  const time = fixedTime(minute, hour)

  // Daily: fixed time, every day/month/dow
  if (time && dom === '*' && month === '*' && dow === '*') {
    return `Daily at ${time}`
  }
  // Weekly: fixed time on a single weekday
  if (time && dom === '*' && month === '*' && /^\d+$/.test(dow)) {
    const day = DAY_NAMES[Number(dow) % 7] ?? `day ${dow}`
    return `Weekly on ${day} at ${time}`
  }
  // Monthly: fixed time on a single day-of-month
  if (time && /^\d+$/.test(dom) && month === '*' && dow === '*') {
    const suffix =
      dom.endsWith('1') && dom !== '11'
        ? 'st'
        : dom.endsWith('2') && dom !== '12'
          ? 'nd'
          : dom.endsWith('3') && dom !== '13'
            ? 'rd'
            : 'th'
    return `Monthly on the ${dom}${suffix} at ${time}`
  }
  // Hourly: every hour at a fixed minute
  if (/^\d+$/.test(minute) && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return `Hourly at :${pad(minute)}`
  }

  return expr
}

export interface CronPreset {
  label: string
  /** Builds the cron expression for the chosen local time (HH:MM). */
  build: (hour: number, minute: number, weekday: number, monthDay: number) => string
}

export const CRON_PRESETS: Record<string, CronPreset> = {
  daily: {
    label: 'Daily',
    build: (h, m) => `${m} ${h} * * *`,
  },
  weekly: {
    label: 'Weekly',
    build: (h, m, weekday) => `${m} ${h} * * ${weekday}`,
  },
  monthly: {
    label: 'Monthly',
    build: (h, m, _weekday, monthDay) => `${m} ${h} ${monthDay} * *`,
  },
  custom: {
    label: 'Custom cron',
    build: () => '',
  },
}
