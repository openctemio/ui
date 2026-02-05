'use client'

import { memo } from 'react'
import { Pencil, Trash2, Globe, Sparkles, Wrench, Bot, Eye } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DynamicIcon } from '@/components/dynamic-icon'

import type { Capability, CapabilityUsageStatsBatchResponse } from '@/lib/api/capability-types'

interface CapabilityTableProps {
  capabilities: Capability[]
  usageStats?: CapabilityUsageStatsBatchResponse
  onEdit?: (capability: Capability) => void
  onDelete?: (capability: Capability) => void
  onViewDetails?: (capability: Capability) => void
  readOnly?: boolean
}

// Get color class from color name
function getColorClass(color: string) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    green: 'bg-green-500/10 text-green-500',
    red: 'bg-red-500/10 text-red-500',
    orange: 'bg-orange-500/10 text-orange-500',
    cyan: 'bg-cyan-500/10 text-cyan-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    lime: 'bg-lime-500/10 text-lime-500',
    teal: 'bg-teal-500/10 text-teal-500',
    indigo: 'bg-indigo-500/10 text-indigo-500',
    fuchsia: 'bg-fuchsia-500/10 text-fuchsia-500',
    amber: 'bg-amber-500/10 text-amber-500',
    violet: 'bg-violet-500/10 text-violet-500',
    sky: 'bg-sky-500/10 text-sky-500',
    slate: 'bg-slate-500/10 text-slate-500',
    gray: 'bg-gray-500/10 text-gray-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
  }
  return colorMap[color] || 'bg-primary/10 text-primary'
}

// Row component
const CapabilityRow = memo(function CapabilityRow({
  capability,
  stats,
  showActions,
  onEdit,
  onDelete,
  onViewDetails,
}: {
  capability: Capability
  stats?: CapabilityUsageStatsBatchResponse[string]
  showActions: boolean
  onEdit?: (capability: Capability) => void
  onDelete?: (capability: Capability) => void
  onViewDetails?: (capability: Capability) => void
}) {
  const colorClass = getColorClass(capability.color)

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}
          >
            <DynamicIcon name={capability.icon} className="h-4 w-4" />
          </div>
          <span className="font-medium">{capability.display_name}</span>
        </div>
      </TableCell>
      <TableCell>
        <code className="text-xs text-muted-foreground">{capability.name}</code>
      </TableCell>
      <TableCell>
        {capability.category && (
          <Badge variant="outline" className="capitalize">
            {capability.category}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="gap-1">
          {capability.is_builtin ? (
            <>
              <Globe className="h-3 w-3" />
              Platform
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              Custom
            </>
          )}
        </Badge>
      </TableCell>
      <TableCell>
        {stats ? (
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={stats.tool_count > 0 ? 'default' : 'outline'}
                  className="gap-1 cursor-help"
                >
                  <Wrench className="h-3 w-3" />
                  {stats.tool_count}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">
                  {stats.tool_count === 0
                    ? 'No tools using this capability'
                    : `${stats.tool_count} tool${stats.tool_count > 1 ? 's' : ''}`}
                </p>
                {stats.tool_names && stats.tool_names.length > 0 && (
                  <ul className="mt-1 text-xs text-muted-foreground">
                    {stats.tool_names.slice(0, 5).map((name) => (
                      <li key={name}>• {name}</li>
                    ))}
                    {stats.tool_names.length > 5 && <li>• +{stats.tool_names.length - 5} more</li>}
                  </ul>
                )}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={stats.agent_count > 0 ? 'default' : 'outline'}
                  className="gap-1 cursor-help"
                >
                  <Bot className="h-3 w-3" />
                  {stats.agent_count}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">
                  {stats.agent_count === 0
                    ? 'No agents with this capability'
                    : `${stats.agent_count} agent${stats.agent_count > 1 ? 's' : ''}`}
                </p>
                {stats.agent_names && stats.agent_names.length > 0 && (
                  <ul className="mt-1 text-xs text-muted-foreground">
                    {stats.agent_names.slice(0, 5).map((name) => (
                      <li key={name}>• {name}</li>
                    ))}
                    {stats.agent_names.length > 5 && (
                      <li>• +{stats.agent_names.length - 5} more</li>
                    )}
                  </ul>
                )}
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="max-w-[300px]">
        <span className="line-clamp-1 text-sm text-muted-foreground">
          {capability.description || '-'}
        </span>
      </TableCell>
      {showActions && (
        <TableCell>
          <div className="flex items-center gap-1">
            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onViewDetails(capability)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onEdit(capability)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => onDelete(capability)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  )
})

export const CapabilityTable = memo(function CapabilityTable({
  capabilities,
  usageStats,
  onEdit,
  onDelete,
  onViewDetails,
  readOnly = false,
}: CapabilityTableProps) {
  // Show actions column if view details is available OR if edit/delete is available
  const showActions = onViewDetails || (!readOnly && (onEdit || onDelete))

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Usage</TableHead>
            <TableHead>Description</TableHead>
            {showActions && <TableHead className="w-[100px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {capabilities.map((capability) => (
            <CapabilityRow
              key={capability.id}
              capability={capability}
              stats={usageStats?.[capability.id]}
              showActions={!!showActions}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
})
