'use client'

import type { ReactNode } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TeamsSection } from '@/features/access-control/components/teams-section'
import { AssignmentRulesSection } from '@/features/access-control/components/assignment-rules-section'
import { useUrlFilter } from '@/hooks/use-url-param'
import { useHasPermission, Permission } from '@/lib/permissions'

type Tab = 'teams' | 'assignment-rules'

/**
 * Teams, with the rules that assign assets to them as a second tab: the rules
 * are each team's scope definition and mean nothing without Teams. Was two
 * pages (/settings/access-control/groups and .../assignment-rules); both 308
 * here (the rules to ?tab=assignment-rules).
 */
export default function TeamsPage() {
  const [tabParam, setTab] = useUrlFilter('tab', 'teams')
  const canSeeRules = useHasPermission(Permission.AssignmentRulesRead)
  const tab: Tab = tabParam === 'assignment-rules' && canSeeRules ? 'assignment-rules' : 'teams'

  const header = (actions: ReactNode) => (
    <>
      <PageHeader
        title="Teams"
        description={
          tab === 'teams'
            ? 'Organize members into teams to control which assets they can see.'
            : 'Rules that assign assets to teams automatically, evaluated in priority order.'
        }
      >
        {actions}
      </PageHeader>
      {canSeeRules && (
        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="assignment-rules">Assignment rules</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </>
  )

  return (
    <Main>
      {tab === 'teams' ? (
        <TeamsSection header={header} />
      ) : (
        <AssignmentRulesSection header={header} />
      )}
    </Main>
  )
}
