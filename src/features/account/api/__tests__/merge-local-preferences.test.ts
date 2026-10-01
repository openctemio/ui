import { beforeEach, describe, expect, it } from 'vitest'
import { getLocalPreferences, mergeLocalPreferences } from '../use-preferences'

describe('mergeLocalPreferences', () => {
  beforeEach(() => localStorage.clear())

  it('keeps what other pages stored and drops the retired e-mail toggles', () => {
    localStorage.setItem(
      'user_preferences',
      JSON.stringify({
        timezone: 'Asia/Ho_Chi_Minh',
        desktop_notifications: true,
        email_notifications: { weekly_digest: false },
      })
    )
    mergeLocalPreferences({ date_format: 'YYYY-MM-DD' })
    expect(getLocalPreferences()).toEqual({
      timezone: 'Asia/Ho_Chi_Minh',
      desktop_notifications: true,
      date_format: 'YYYY-MM-DD',
    })
  })

  it('works from empty storage', () => {
    mergeLocalPreferences({ desktop_notifications: false })
    expect(getLocalPreferences()).toEqual({ desktop_notifications: false })
  })
})
