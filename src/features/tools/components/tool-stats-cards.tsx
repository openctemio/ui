'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Wrench,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  Package,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tool } from '@/lib/api/tool-types';

interface ToolStatsCardsProps {
  tools: Tool[];
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

export function ToolStatsCards({
  tools,
  activeFilter,
  onFilterChange,
}: ToolStatsCardsProps) {
  const totalTools = tools.length;
  const activeTools = tools.filter((t) => t.is_active).length;
  const inactiveTools = tools.filter((t) => !t.is_active).length;
  const updatesAvailable = tools.filter((t) => t.has_update).length;
  const builtinTools = tools.filter((t) => t.is_builtin).length;
  const customTools = tools.filter((t) => !t.is_builtin).length;

  const stats = [
    {
      id: 'total',
      label: 'Total Tools',
      value: totalTools,
      icon: Wrench,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      filter: null,
    },
    {
      id: 'active',
      label: 'Active',
      value: activeTools,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      filter: 'status:active',
    },
    {
      id: 'inactive',
      label: 'Inactive',
      value: inactiveTools,
      icon: XCircle,
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
      filter: 'status:inactive',
    },
    {
      id: 'updates',
      label: 'Updates Available',
      value: updatesAvailable,
      icon: ArrowUpCircle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      filter: 'has_update:true',
    },
    {
      id: 'builtin',
      label: 'Built-in',
      value: builtinTools,
      icon: Package,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      filter: 'type:builtin',
    },
    {
      id: 'custom',
      label: 'Custom',
      value: customTools,
      icon: Activity,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      filter: 'type:custom',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => {
        const isActive = activeFilter === stat.filter;
        return (
          <Card
            key={stat.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              isActive && 'ring-2 ring-primary ring-offset-2'
            )}
            onClick={() => onFilterChange(isActive ? null : stat.filter)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('rounded-lg p-2', stat.bgColor)}>
                  <stat.icon className={cn('h-4 w-4', stat.color)} />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
