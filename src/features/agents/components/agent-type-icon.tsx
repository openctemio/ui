"use client";

import { Play, Server, Database, Radar, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentType } from "@/lib/api/agent-types";

interface AgentTypeIconProps {
  type: AgentType;
  className?: string;
}

// Agent types: runner (CI/CD), worker (daemon), collector (assets), sensor (EASM)
const AGENT_TYPE_ICONS: Record<AgentType, LucideIcon> = {
  runner: Play,        // CI/CD one-shot execution
  worker: Server,      // Long-running daemon
  collector: Database, // Asset discovery
  sensor: Radar,       // EASM monitoring
};

export function AgentTypeIcon({ type, className }: AgentTypeIconProps) {
  const Icon = AGENT_TYPE_ICONS[type] || Server;
  return <Icon className={cn("h-4 w-4", className)} />;
}

export const AGENT_TYPE_COLORS: Record<AgentType, string> = {
  runner: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  worker: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  collector: "bg-green-500/10 text-green-600 border-green-500/30",
  sensor: "bg-orange-500/10 text-orange-600 border-orange-500/30",
};

export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  runner: "Runner",    // CI/CD pipeline runner
  worker: "Worker",    // Daemon worker
  collector: "Collector", // Asset collector
  sensor: "Sensor",    // EASM sensor
};
