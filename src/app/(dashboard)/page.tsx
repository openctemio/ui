'use client'

import { useEffect, useState } from 'react'

import { Main } from '@/components/layout'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CtemDashboard } from '@/features/dashboard/components/ctem-dashboard'
import { ClassicDashboard } from '@/features/dashboard/components/classic-dashboard'

type DashboardView = 'ctem' | 'classic'

const STORAGE_KEY = 'openctem:dashboard-view'
const DEFAULT_VIEW: DashboardView = 'ctem'

function isDashboardView(value: string | null): value is DashboardView {
  return value === 'ctem' || value === 'classic'
}

/**
 * Main dashboard shell. The product ships two views — the new CTEM action-first
 * dashboard (default) and the previous ("Classic") dashboard — and lets the user
 * switch between them. The choice persists in localStorage.
 *
 * Hydration: server and the first client render both use DEFAULT_VIEW so the
 * markup matches; the persisted choice is only applied inside useEffect, which
 * never runs on the server. Each view fetches its own data and only the active
 * TabsContent is mounted, so there is no shared state or double-fetching.
 */
export default function Dashboard() {
  const [view, setView] = useState<DashboardView>(DEFAULT_VIEW)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (isDashboardView(saved)) setView(saved)
    } catch {
      // localStorage unavailable (private mode, etc.) — keep the default.
    }
  }, [])

  const handleChange = (next: string) => {
    if (!isDashboardView(next)) return
    setView(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Persisting is best-effort; the in-memory choice still applies.
    }
  }

  // Built once and handed to whichever view is active. Only the active
  // TabsContent mounts, so exactly one switcher renders — inside that view's
  // page header rather than in a standalone row above the content.
  const viewSwitcher = (
    <TabsList aria-label="Dashboard view">
      <TabsTrigger value="ctem">CTEM</TabsTrigger>
      <TabsTrigger value="classic">Classic</TabsTrigger>
    </TabsList>
  )

  return (
    <Main>
      <Tabs value={view} onValueChange={handleChange} className="gap-6">
        <TabsContent value="ctem">
          <CtemDashboard headerSwitcher={viewSwitcher} />
        </TabsContent>
        <TabsContent value="classic">
          <ClassicDashboard headerSwitcher={viewSwitcher} />
        </TabsContent>
      </Tabs>
    </Main>
  )
}
