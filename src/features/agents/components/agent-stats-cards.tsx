'use client';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Bot,
  CheckCircle,
  AlertCircle,
  Play,
  Server,
  Database,
} from 'lucide-react';
import type { Agent, AgentType, ExecutionMode } from '@/lib/api/agent-types';

interface AgentStats {
  total: number;
  active: number;        // status === 'active'
  disabled: number;      // status === 'disabled' || status === 'revoked'
  online: number;        // health === 'online' (for active agents)
  offline: number;       // health === 'offline' || health === 'unknown'
  error: number;         // health === 'error'
  byType: Record<AgentType, number>;
  byMode: Record<ExecutionMode, number>;
}

interface AgentStatsCardsProps {
  agents: Agent[];
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

function calculateAgentStats(agents: Agent[]): AgentStats {
  const activeAgents = agents.filter((a) => a.status === 'active');

  return {
    total: agents.length,
    active: activeAgents.length,
    disabled: agents.filter((a) => a.status === 'disabled' || a.status === 'revoked').length,
    online: activeAgents.filter((a) => a.health === 'online').length,
    offline: activeAgents.filter((a) => a.health === 'offline' || a.health === 'unknown').length,
    error: agents.filter((a) => a.health === 'error').length,
    byType: {
      runner: agents.filter((a) => a.type === 'runner').length,
      worker: agents.filter((a) => a.type === 'worker').length,
      collector: agents.filter((a) => a.type === 'collector').length,
      sensor: agents.filter((a) => a.type === 'sensor').length,
    },
    byMode: {
      standalone: agents.filter((a) => a.execution_mode === 'standalone').length,
      daemon: agents.filter((a) => a.execution_mode === 'daemon').length,
    },
  };
}

export function AgentStatsCards({
  agents,
  activeFilter,
  onFilterChange,
}: AgentStatsCardsProps) {
  const stats = calculateAgentStats(agents);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {/* Total Agents */}
      <Card
        className={`cursor-pointer transition-colors hover:border-primary ${
          activeFilter === null ? 'border-primary' : ''
        }`}
        onClick={() => onFilterChange(null)}
      >
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Total
          </CardDescription>
          <CardTitle className="text-2xl">{stats.total}</CardTitle>
        </CardHeader>
      </Card>

      {/* Online */}
      <Card
        className={`cursor-pointer transition-colors hover:border-green-500 ${
          activeFilter === 'health:online' ? 'border-green-500' : ''
        }`}
        onClick={() =>
          onFilterChange(activeFilter === 'health:online' ? null : 'health:online')
        }
      >
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Online
          </CardDescription>
          <CardTitle className="text-2xl text-green-500">{stats.online}</CardTitle>
        </CardHeader>
      </Card>

      {/* Error */}
      <Card
        className={`cursor-pointer transition-colors hover:border-red-500 ${
          activeFilter === 'health:error' ? 'border-red-500' : ''
        }`}
        onClick={() =>
          onFilterChange(activeFilter === 'health:error' ? null : 'health:error')
        }
      >
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Error
          </CardDescription>
          <CardTitle className="text-2xl text-red-500">{stats.error}</CardTitle>
        </CardHeader>
      </Card>

      {/* Daemon Agents */}
      <Card
        className={`cursor-pointer transition-colors hover:border-blue-500 ${
          activeFilter === 'mode:daemon' ? 'border-blue-500' : ''
        }`}
        onClick={() =>
          onFilterChange(activeFilter === 'mode:daemon' ? null : 'mode:daemon')
        }
      >
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Server className="h-4 w-4 text-blue-500" />
            Daemon
          </CardDescription>
          <CardTitle className="text-2xl text-blue-500">{stats.byMode.daemon}</CardTitle>
        </CardHeader>
      </Card>

      {/* Standalone (CI/CD Runners) */}
      <Card
        className={`cursor-pointer transition-colors hover:border-purple-500 ${
          activeFilter === 'mode:standalone' ? 'border-purple-500' : ''
        }`}
        onClick={() =>
          onFilterChange(activeFilter === 'mode:standalone' ? null : 'mode:standalone')
        }
      >
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Play className="h-4 w-4 text-purple-500" />
            CI/CD
          </CardDescription>
          <CardTitle className="text-2xl text-purple-500">
            {stats.byMode.standalone}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Collectors */}
      <Card
        className={`cursor-pointer transition-colors hover:border-orange-500 ${
          activeFilter === 'type:collector' ? 'border-orange-500' : ''
        }`}
        onClick={() =>
          onFilterChange(activeFilter === 'type:collector' ? null : 'type:collector')
        }
      >
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Database className="h-4 w-4 text-orange-500" />
            Collectors
          </CardDescription>
          <CardTitle className="text-2xl text-orange-500">
            {stats.byType.collector}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

/**
 * Compact stats for inline display
 */
export function AgentStatsInline({ agents }: { agents: Agent[] }) {
  const stats = calculateAgentStats(agents);

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground">{stats.total} agents</span>
      <span className="text-green-500">{stats.online} online</span>
      {stats.error > 0 && <span className="text-red-500">{stats.error} error</span>}
    </div>
  );
}
