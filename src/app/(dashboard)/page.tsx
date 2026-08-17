'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { Plus } from 'lucide-react'

import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/features/shared'
import { Can, Permission } from '@/lib/permissions'
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

  return (
    <Main>
      <Tabs value={view} onValueChange={handleChange} className="flex flex-col gap-6">
        {/* One shared header, rendered outside TabsContent so the view switcher
            renders exactly once and stays put when the active view changes. */}
        <PageHeader
          title="Dashboard"
          description="Continuous threat exposure — what's exploitable now, and what to do about it."
        >
          <div className="flex items-center gap-2">
            <Can permission={Permission.ScansWrite} mode="disable">
              <Button asChild size="sm">
                <Link href="/scans">
                  <Plus className="me-2 h-4 w-4" />
                  Run scan
                </Link>
              </Button>
            </Can>
            <TabsList aria-label="Dashboard view">
              <TabsTrigger value="ctem">CTEM</TabsTrigger>
              <TabsTrigger value="classic">Classic</TabsTrigger>
            </TabsList>
          </div>
        </PageHeader>
        <TabsContent value="ctem">
          <CtemDashboard />
        </TabsContent>
        <TabsContent value="classic">
          <ClassicDashboard />
        </TabsContent>
      </Tabs>
    </Main>
  )
}
