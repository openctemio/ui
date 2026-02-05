'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
  Settings,
  KeyRound,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Activity,
  AlertTriangle,
  FileCode,
  Server,
  Play,
  Power,
  PowerOff,
  History,
  BarChart3,
} from 'lucide-react'

import type { Agent } from '@/lib/api/agent-types'
import { CapabilityBadge } from '@/components/capability-badge'
import { AgentTypeIcon, AGENT_TYPE_LABELS, AGENT_TYPE_COLORS } from './agent-type-icon'
import { AgentAuditLog } from './agent-audit-log'
import { AgentAnalytics } from './agent-analytics'
import { Can, Permission } from '@/lib/permissions'

interface AgentDetailSheetProps {
  agent: Agent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (agent: Agent) => void
  onRegenerateKey: (agent: Agent) => void
  onViewConfig: (agent: Agent) => void
  onDelete: (agent: Agent) => void
  onActivate?: (agent: Agent) => void
  onDeactivate?: (agent: Agent) => void
  onRevoke?: (agent: Agent) => void
}

// Status config for admin-controlled status (active, disabled, revoked)
const statusConfig: Record<
  string,
  { icon: React.ReactNode; color: string; bgColor: string; label: string }
> = {
  active: {
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    label: 'Active',
  },
  disabled: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400',
    label: 'Disabled',
  },
  revoked: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500',
    label: 'Revoked',
  },
}

// Health config for heartbeat-based health (online, offline, error, unknown)
const healthConfig: Record<
  string,
  { icon: React.ReactNode; color: string; bgColor: string; label: string }
> = {
  online: {
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    label: 'Online',
  },
  offline: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400',
    label: 'Offline',
  },
  error: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    label: 'Error',
  },
  unknown: {
    icon: <Clock className="h-3.5 w-3.5" />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
    label: 'Unknown',
  },
}

export function AgentDetailSheet({
  agent,
  open,
  onOpenChange,
  onEdit,
  onRegenerateKey,
  onViewConfig,
  onDelete,
  onActivate,
  onDeactivate,
  onRevoke,
}: AgentDetailSheetProps) {
  if (!agent) return null

  // Use health for display when agent is active, otherwise show admin status
  const displayHealth =
    agent.status === 'active'
      ? healthConfig[agent.health] || healthConfig.unknown
      : statusConfig[agent.status] || statusConfig.disabled
  const isDaemon = agent.execution_mode === 'daemon'

  // Gradient based on health (for active agents) or status
  const gradientClass =
    agent.status !== 'active'
      ? 'from-gray-500/20 via-gray-500/10'
      : agent.health === 'online'
        ? 'from-green-500/20 via-green-500/10'
        : agent.health === 'error'
          ? 'from-red-500/20 via-red-500/10'
          : 'from-gray-500/20 via-gray-500/10'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto p-0 sm:max-w-xl">
        <VisuallyHidden>
          <SheetTitle>Agent Details</SheetTitle>
        </VisuallyHidden>

        {/* Header */}
        <div className={`bg-gradient-to-br px-6 pb-4 pt-6 ${gradientClass} to-transparent`}>
          <div className="mb-3 flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${AGENT_TYPE_COLORS[agent.type]}`}
            >
              <AgentTypeIcon type={agent.type} className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{agent.name}</h2>
              <p className="text-sm text-muted-foreground">
                {agent.description || AGENT_TYPE_LABELS[agent.type]}
              </p>
            </div>
            <Badge className={`${displayHealth.bgColor} text-white gap-1`}>
              {displayHealth.icon}
              {displayHealth.label}
            </Badge>
          </div>

          {/* Execution Mode Badge */}
          <div className="mb-4 flex items-center gap-2">
            {isDaemon ? (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                <Server className="mr-1 h-3 w-3" />
                Daemon Mode
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
                <Play className="mr-1 h-3 w-3" />
                Standalone Mode
              </Badge>
            )}
            <Badge variant="outline">{AGENT_TYPE_LABELS[agent.type]}</Badge>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Can permission={Permission.AgentsWrite}>
              <Button size="sm" variant="secondary" onClick={() => onEdit(agent)}>
                <Settings className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Can>
            <Button size="sm" variant="outline" onClick={() => onViewConfig(agent)}>
              <FileCode className="mr-2 h-4 w-4" />
              View Config
            </Button>
            <Can permission={Permission.AgentsWrite}>
              <Button size="sm" variant="outline" onClick={() => onRegenerateKey(agent)}>
                <KeyRound className="mr-2 h-4 w-4" />
                Regenerate Key
              </Button>
              {(agent.status === 'disabled' || agent.status === 'revoked') && onActivate && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-500/30 text-green-500 hover:bg-green-500/10"
                  onClick={() => onActivate(agent)}
                >
                  <Power className="mr-2 h-4 w-4" />
                  Activate
                </Button>
              )}
              {agent.status === 'active' && onDeactivate && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                  onClick={() => onDeactivate(agent)}
                >
                  <PowerOff className="mr-2 h-4 w-4" />
                  Deactivate
                </Button>
              )}
            </Can>
          </div>
        </div>

        {/* Content */}
        <Tabs defaultValue="overview" className="px-6 pb-6">
          <TabsList className="mb-4 grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="mr-1 h-3 w-3" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
            <TabsTrigger value="activity">
              <History className="mr-1 h-3 w-3" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-4">
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border bg-card p-4 text-center">
                <Activity className="mx-auto mb-2 h-5 w-5 text-blue-500" />
                <p className="text-2xl font-bold">{agent.total_scans.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Scans</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <AlertTriangle
                  className={`mx-auto mb-2 h-5 w-5 ${
                    agent.total_findings > 0 ? 'text-amber-500' : 'text-muted-foreground'
                  }`}
                />
                <p className="text-2xl font-bold">{agent.total_findings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Findings</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <AlertCircle
                  className={`mx-auto mb-2 h-5 w-5 ${
                    agent.error_count > 0 ? 'text-red-500' : 'text-muted-foreground'
                  }`}
                />
                <p className="text-2xl font-bold">{agent.error_count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>

            {/* Tools */}
            {agent.tools.length > 0 && (
              <div className="rounded-xl border bg-card p-4">
                <h4 className="mb-2 text-sm font-medium">Tools</h4>
                <div className="flex flex-wrap gap-1">
                  {agent.tools.map((tool) => (
                    <Badge key={tool} variant="secondary">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Labels */}
            {agent.labels && Object.keys(agent.labels).length > 0 && (
              <div className="rounded-xl border bg-card p-4">
                <h4 className="mb-2 text-sm font-medium">Labels</h4>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(agent.labels).map(([key, value]) => (
                    <Badge key={key} variant="outline">
                      {key}: {value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Status Message */}
            {agent.status_message && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <h4 className="mb-1 text-sm font-medium text-amber-500">Status Message</h4>
                <p className="text-sm text-muted-foreground">{agent.status_message}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <div className="rounded-xl border bg-card p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <BarChart3 className="h-4 w-4" />
                Session Analytics (Last 30 Days)
              </h4>
              <AgentAnalytics agentId={agent.id} />
            </div>
          </TabsContent>

          <TabsContent value="capabilities" className="mt-0 space-y-4">
            {/* Capabilities */}
            <div className="rounded-xl border bg-card p-4">
              <h4 className="mb-3 text-sm font-medium">Capabilities</h4>
              {agent.capabilities.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {agent.capabilities.map((cap) => (
                    <div key={cap} className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <CapabilityBadge name={cap} showIcon />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No capabilities configured</p>
              )}
            </div>

            {/* API Key */}
            <div className="rounded-xl border bg-card p-4">
              <h4 className="mb-2 text-sm font-medium">API Key</h4>
              <div className="flex items-center justify-between">
                <code className="rounded bg-muted px-2 py-1 text-xs">
                  {agent.api_key_prefix}...
                </code>
                <Can permission={Permission.AgentsWrite}>
                  <Button size="sm" variant="outline" onClick={() => onRegenerateKey(agent)}>
                    <KeyRound className="mr-2 h-3 w-3" />
                    Regenerate
                  </Button>
                </Can>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <div className="rounded-xl border bg-card p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <History className="h-4 w-4" />
                Activity Log
              </h4>
              <AgentAuditLog agentId={agent.id} />
            </div>
          </TabsContent>

          <TabsContent value="details" className="mt-0 space-y-4">
            {/* Agent Information */}
            <div className="rounded-xl border bg-card p-4">
              <h4 className="mb-3 text-sm font-medium">Agent Information</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge variant="outline">{AGENT_TYPE_LABELS[agent.type]}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Execution Mode</span>
                  <span className="text-sm">
                    {agent.execution_mode === 'daemon' ? 'Daemon' : 'Standalone'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Version</span>
                  <span className="font-mono text-sm">{agent.version || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hostname</span>
                  <span className="text-sm">{agent.hostname || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">IP Address</span>
                  <code className="rounded bg-muted px-2 py-1 text-xs">
                    {agent.ip_address || 'N/A'}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Seen</span>
                  <span className="text-sm">
                    {agent.last_seen_at ? new Date(agent.last_seen_at).toLocaleString() : 'Never'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">{new Date(agent.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <Can permission={Permission.AgentsDelete}>
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                <h4 className="mb-2 text-sm font-medium text-red-500">Danger Zone</h4>
                <div className="space-y-3">
                  {/* Revoke - only show if not already revoked */}
                  {agent.status !== 'revoked' && onRevoke && (
                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Permanently revoke this agent&apos;s access. The agent will not be able to
                        authenticate.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10"
                        onClick={() => onRevoke(agent)}
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Revoke Access
                      </Button>
                    </div>
                  )}

                  {/* Delete */}
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Permanently delete this agent and invalidate its API key.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        onDelete(agent)
                        onOpenChange(false)
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Agent
                    </Button>
                  </div>
                </div>
              </div>
            </Can>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
