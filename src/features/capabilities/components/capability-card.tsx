'use client'

import { memo } from 'react'
import { MoreHorizontal, Pencil, Trash2, Globe, Sparkles, Wrench, Bot, Eye } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DynamicIcon } from '@/components/dynamic-icon'

import type { Capability, CapabilityUsageStats } from '@/lib/api/capability-types'

interface CapabilityCardProps {
  capability: Capability
  usageStats?: CapabilityUsageStats
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

export const CapabilityCard = memo(function CapabilityCard({
  capability,
  usageStats,
  onEdit,
  onDelete,
  onViewDetails,
  readOnly = false,
}: CapabilityCardProps) {
  const colorClass = getColorClass(capability.color)
  const showActions = !readOnly && (onEdit || onDelete)

  return (
    <Card className="group relative transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClass}`}
            >
              <DynamicIcon name={capability.icon} className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight">{capability.display_name}</CardTitle>
              <code className="text-xs text-muted-foreground">{capability.name}</code>
            </div>
          </div>
          {(showActions || onViewDetails) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onViewDetails && (
                  <DropdownMenuItem onClick={() => onViewDetails(capability)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                )}
                {onViewDetails && (onEdit || onDelete) && <DropdownMenuSeparator />}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(capability)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(capability)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {capability.description && (
          <CardDescription className="line-clamp-2 text-sm">
            {capability.description}
          </CardDescription>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {capability.category && (
            <Badge variant="outline" className="capitalize">
              {capability.category}
            </Badge>
          )}
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
          {/* Usage Stats Badges */}
          {usageStats && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant={usageStats.tool_count > 0 ? 'default' : 'outline'}
                    className="gap-1 cursor-help"
                  >
                    <Wrench className="h-3 w-3" />
                    {usageStats.tool_count}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">
                    {usageStats.tool_count === 0
                      ? 'No tools using this capability'
                      : `${usageStats.tool_count} tool${usageStats.tool_count > 1 ? 's' : ''} using this capability`}
                  </p>
                  {usageStats.tool_names && usageStats.tool_names.length > 0 && (
                    <ul className="mt-1 text-xs text-muted-foreground">
                      {usageStats.tool_names.slice(0, 5).map((name) => (
                        <li key={name}>• {name}</li>
                      ))}
                      {usageStats.tool_names.length > 5 && (
                        <li>• +{usageStats.tool_names.length - 5} more</li>
                      )}
                    </ul>
                  )}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant={usageStats.agent_count > 0 ? 'default' : 'outline'}
                    className="gap-1 cursor-help"
                  >
                    <Bot className="h-3 w-3" />
                    {usageStats.agent_count}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">
                    {usageStats.agent_count === 0
                      ? 'No agents with this capability'
                      : `${usageStats.agent_count} agent${usageStats.agent_count > 1 ? 's' : ''} with this capability`}
                  </p>
                  {usageStats.agent_names && usageStats.agent_names.length > 0 && (
                    <ul className="mt-1 text-xs text-muted-foreground">
                      {usageStats.agent_names.slice(0, 5).map((name) => (
                        <li key={name}>• {name}</li>
                      ))}
                      {usageStats.agent_names.length > 5 && (
                        <li>• +{usageStats.agent_names.length - 5} more</li>
                      )}
                    </ul>
                  )}
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
