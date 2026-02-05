'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MoreHorizontal,
  Cpu,
  HardDrive,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Power,
  PowerOff,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Agent } from '@/lib/api/agent-types';
import { AgentTypeIcon, AGENT_TYPE_COLORS } from './agent-type-icon';

interface AgentMonitoringCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onViewConfig: (agent: Agent) => void;
  onActivate: (agent: Agent) => void;
  onDeactivate: (agent: Agent) => void;
  onViewDetails: (agent: Agent) => void;
}

// Note: Online status now comes from the health field in Agent type
// The backend tracks heartbeat and sets health = 'online' | 'offline' | 'error' | 'unknown'

// Format uptime from last_seen_at
function formatUptime(lastSeenAt?: string): string {
  if (!lastSeenAt) return '—';
  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();

  if (diffMs < 60000) return 'Just now';
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
  return `${Math.floor(diffMs / 86400000)}d ago`;
}

export function AgentMonitoringCard({
  agent,
  onEdit,
  onViewConfig,
  onActivate,
  onDeactivate,
  onViewDetails,
}: AgentMonitoringCardProps) {
  // Use health field from backend (heartbeat-based)
  const isOnline = agent.status === 'active' && agent.health === 'online';
  const isActive = agent.status === 'active';
  const hasError = agent.health === 'error';

  // Mock metrics - will be replaced when backend supports
  // These could come from agent.metadata or a separate metrics endpoint
  // Using deterministic hash based on agent ID for consistent display
  const hash = agent.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const metrics = {
    cpu: (hash % 60) + 20,
    memory: (hash % 50) + 30,
    activeJobs: agent.status === 'active' ? (hash % 5) + 1 : 0,
  };

  return (
    <Card
      className={cn(
        'transition-all hover:border-primary/50 cursor-pointer',
        isOnline && 'border-green-500/30',
        !isOnline && agent.status === 'active' && !hasError && 'border-yellow-500/30',
        agent.status === 'disabled' && 'border-gray-500/30 opacity-75',
        hasError && 'border-red-500/30'
      )}
      onClick={() => onViewDetails(agent)}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  AGENT_TYPE_COLORS[agent.type]
                )}
              >
                <AgentTypeIcon type={agent.type} className="h-5 w-5" />
              </div>
              {/* Online indicator */}
              <div
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
                  isOnline ? 'bg-green-500' : 'bg-gray-400'
                )}
              />
            </div>
            <div>
              <h3 className="font-medium text-sm">{agent.name}</h3>
              <p className="text-xs text-muted-foreground">
                {agent.hostname || agent.ip_address || 'No host info'}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onViewDetails(agent)}>
                <Activity className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(agent)}>
                <Settings className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewConfig(agent)}>
                <Settings className="mr-2 h-4 w-4" />
                View Config
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {agent.status === 'disabled' || agent.status === 'revoked' ? (
                <DropdownMenuItem
                  onClick={() => onActivate(agent)}
                  className="text-green-500"
                >
                  <Power className="mr-2 h-4 w-4" />
                  Activate
                </DropdownMenuItem>
              ) : agent.status === 'active' ? (
                <DropdownMenuItem
                  onClick={() => onDeactivate(agent)}
                  className="text-amber-500"
                >
                  <PowerOff className="mr-2 h-4 w-4" />
                  Deactivate
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 mb-3">
          <Badge
            variant="secondary"
            className={cn(
              'text-xs',
              isOnline
                ? 'bg-green-500/10 text-green-500'
                : 'bg-gray-500/10 text-gray-500'
            )}
          >
            {isOnline ? (
              <CheckCircle className="mr-1 h-3 w-3" />
            ) : (
              <XCircle className="mr-1 h-3 w-3" />
            )}
            {isOnline ? 'Online' : 'Offline'}
          </Badge>

          {metrics.activeJobs > 0 && (
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 text-xs">
              <Activity className="mr-1 h-3 w-3" />
              {metrics.activeJobs} jobs
            </Badge>
          )}

          {agent.error_count > 0 && (
            <Badge variant="secondary" className="bg-red-500/10 text-red-500 text-xs">
              <AlertTriangle className="mr-1 h-3 w-3" />
              {agent.error_count}
            </Badge>
          )}
        </div>

        {/* Metrics - Only show if online */}
        {isOnline && isActive && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-3 w-3 text-muted-foreground" />
              <div className="flex-1">
                <Progress
                  value={metrics.cpu}
                  className={cn(
                    'h-1.5',
                    metrics.cpu > 80 && '[&>div]:bg-red-500',
                    metrics.cpu > 60 && metrics.cpu <= 80 && '[&>div]:bg-yellow-500'
                  )}
                />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right">
                {metrics.cpu}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="h-3 w-3 text-muted-foreground" />
              <div className="flex-1">
                <Progress
                  value={metrics.memory}
                  className={cn(
                    'h-1.5',
                    metrics.memory > 80 && '[&>div]:bg-red-500',
                    metrics.memory > 60 && metrics.memory <= 80 && '[&>div]:bg-yellow-500'
                  )}
                />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right">
                {metrics.memory}%
              </span>
            </div>
          </div>
        )}

        {/* Footer stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {agent.total_scans.toLocaleString()} scans
                </span>
              </TooltipTrigger>
              <TooltipContent>Total scans completed</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatUptime(agent.last_seen_at)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Last seen: {agent.last_seen_at
                  ? new Date(agent.last_seen_at).toLocaleString()
                  : 'Never'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
