'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronDown, Check, Star, LayoutGrid, Settings2, Trash2, Pencil } from 'lucide-react'

import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/features/shared'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { Can, Permission } from '@/lib/permissions'
import { getErrorMessage } from '@/lib/api/error-handler'
import { CtemDashboard } from '@/features/dashboard/components/ctem-dashboard'
import { ClassicDashboard } from '@/features/dashboard/components/classic-dashboard'
import { DashboardCanvas } from '@/features/dashboards/components/dashboard-canvas'
import {
  useMyDashboards,
  useRevalidateDashboards,
  setDefaultDashboard,
  deleteDashboard,
} from '@/features/dashboards/api/use-dashboards-api'

const STORAGE_KEY = 'openctem:dashboard-view'
const BUILTINS = ['ctem', 'classic'] as const
const BUILTIN_LABEL: Record<string, string> = { ctem: 'CTEM', classic: 'Classic' }

/**
 * Main dashboard shell with a Tenable-style dashboard switcher. Two built-in views
 * (CTEM / Classic) plus the user's saved custom dashboards are all selectable from
 * one "Switch Dashboard" menu; the chosen view persists in localStorage and falls
 * back to the user's default custom dashboard on first load.
 */
export default function Dashboard() {
  const { data, isLoading } = useMyDashboards()
  const revalidate = useRevalidateDashboards()
  const custom = useMemo(() => data?.data ?? [], [data])

  const [active, setActive] = useState<string>('ctem')
  const [restored, setRestored] = useState(false)

  // Resolve the initial view once dashboards have loaded: a persisted choice wins,
  // else the user's default custom dashboard, else CTEM.
  useEffect(() => {
    if (restored || isLoading) return
    let saved: string | null = null
    try {
      saved = window.localStorage.getItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    const validSaved =
      saved &&
      ((BUILTINS as readonly string[]).includes(saved) || custom.some((d) => d.id === saved))
    if (validSaved) {
      setActive(saved as string)
    } else {
      const def = custom.find((d) => d.is_default)
      if (def) setActive(def.id)
    }
    setRestored(true)
  }, [restored, isLoading, custom])

  const choose = (key: string) => {
    setActive(key)
    try {
      window.localStorage.setItem(STORAGE_KEY, key)
    } catch {
      // best-effort
    }
  }

  const activeCustom = custom.find((d) => d.id === active)
  const activeLabel = activeCustom ? activeCustom.name : BUILTIN_LABEL[active] || 'Dashboard'

  const makeDefault = async (id: string) => {
    try {
      await setDefaultDashboard(id)
      await revalidate()
      toast.success('Default dashboard set')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const remove = async (id: string, name: string) => {
    try {
      await deleteDashboard(id)
      await revalidate()
      choose('ctem')
      toast.success(`Deleted "${name}"`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <Main>
      <div className="flex flex-col gap-6">
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

            {/* Switch Dashboard */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <LayoutGrid className="me-2 h-4 w-4" />
                  {activeLabel}
                  <ChevronDown className="ms-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Built-in</DropdownMenuLabel>
                {BUILTINS.map((key) => (
                  <DropdownMenuItem key={key} onClick={() => choose(key)}>
                    <span className="flex-1">{BUILTIN_LABEL[key]}</span>
                    {active === key && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Your dashboards</DropdownMenuLabel>
                {custom.length === 0 ? (
                  <DropdownMenuItem disabled>No custom dashboards yet</DropdownMenuItem>
                ) : (
                  custom.map((d) => (
                    <DropdownMenuItem key={d.id} onClick={() => choose(d.id)}>
                      <span className="flex-1 truncate">{d.name}</span>
                      {d.is_default && <Star className="me-1 h-3.5 w-3.5 text-muted-foreground" />}
                      {active === d.id && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboards">Manage dashboards…</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="me-2 h-4 w-4" />
                  Options
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link href="/dashboards">
                    <Plus className="me-2 h-4 w-4" /> New dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboards">
                    <LayoutGrid className="me-2 h-4 w-4" /> Manage dashboards
                  </Link>
                </DropdownMenuItem>
                {activeCustom && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboards">
                        <Pencil className="me-2 h-4 w-4" /> Edit “{activeCustom.name}”
                      </Link>
                    </DropdownMenuItem>
                    {!activeCustom.is_default && (
                      <DropdownMenuItem onClick={() => makeDefault(activeCustom.id)}>
                        <Star className="me-2 h-4 w-4" /> Set as default
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => remove(activeCustom.id, activeCustom.name)}
                    >
                      <Trash2 className="me-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </PageHeader>

        {active === 'ctem' ? (
          <CtemDashboard />
        ) : active === 'classic' ? (
          <ClassicDashboard />
        ) : activeCustom ? (
          <DashboardCanvas layout={activeCustom.layout} />
        ) : (
          // Active id no longer exists (e.g. deleted elsewhere) — fall back.
          <CtemDashboard />
        )}
      </div>
    </Main>
  )
}
