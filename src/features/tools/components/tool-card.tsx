'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
  MoreHorizontal,
  Eye,
  Settings,
  Trash2,
  ExternalLink,
  ArrowUpCircle,
  Github,
  Power,
  PowerOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Can, Permission, useHasPermission } from '@/lib/permissions';
import type { Tool } from '@/lib/api/tool-types';
import type { ToolCategory } from '@/lib/api/tool-category-types';
import { getCategoryNameById, getCategoryDisplayNameById } from '@/lib/api/tool-category-hooks';
import { ToolCategoryIcon, getCategoryBadgeColor } from './tool-category-icon';
import { INSTALL_METHOD_DISPLAY_NAMES } from '@/lib/api/tool-types';

interface ToolCardProps {
  tool: Tool;
  categories?: ToolCategory[]; // For looking up category name from category_id
  selected?: boolean;
  onSelect?: () => void;
  onView?: (tool: Tool) => void;
  onEdit?: (tool: Tool) => void;
  onDelete?: (tool: Tool) => void;
  onActivate?: (tool: Tool) => void;
  onDeactivate?: (tool: Tool) => void;
  onCheckUpdate?: (tool: Tool) => void;
  /** When true, hides edit/delete/activate/deactivate actions (for platform tools) */
  readOnly?: boolean;
}

export function ToolCard({
  tool,
  categories,
  selected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onCheckUpdate,
  readOnly = false,
}: ToolCardProps) {
  // Look up category name from category_id
  const categoryName = getCategoryNameById(categories, tool.category_id);
  const categoryDisplayName = getCategoryDisplayNameById(categories, tool.category_id);
  const canWriteTools = useHasPermission(Permission.ToolsWrite);
  return (
    <Card
      className={cn(
        'group relative cursor-pointer transition-all hover:shadow-md',
        selected && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              {tool.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tool.logo_url}
                  alt={tool.display_name}
                  className="h-10 w-10 rounded-lg object-contain"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <ToolCategoryIcon category={categoryName} className="h-5 w-5" />
                </div>
              )}
              {/* Status indicator on icon - only for read-only/platform tools */}
              {readOnly && (
                <div
                  className={cn(
                    'absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background',
                    tool.is_active ? 'bg-green-500' : 'bg-zinc-400'
                  )}
                >
                  <Power className="h-2 w-2 text-white" />
                </div>
              )}
            </div>
            <div>
              <CardTitle className="text-base">{tool.display_name}</CardTitle>
              <CardDescription className="text-xs">
                {tool.name}
                {tool.current_version && (
                  <span className="ml-1 text-muted-foreground">
                    v{tool.current_version}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onView?.(tool)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {!readOnly && !tool.is_builtin && onEdit && (
                <Can permission={Permission.ToolsWrite}>
                  <DropdownMenuItem onClick={() => onEdit(tool)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                </Can>
              )}
              {tool.has_update && (
                <DropdownMenuItem onClick={() => onCheckUpdate?.(tool)}>
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Check Update
                </DropdownMenuItem>
              )}
              {tool.github_url && (
                <DropdownMenuItem asChild>
                  <a
                    href={tool.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    GitHub
                  </a>
                </DropdownMenuItem>
              )}
              {tool.docs_url && (
                <DropdownMenuItem asChild>
                  <a
                    href={tool.docs_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Documentation
                  </a>
                </DropdownMenuItem>
              )}
              {/* Only show activate/deactivate for custom tools (not read-only) */}
              {!readOnly && (onActivate || onDeactivate) && (
                <Can permission={Permission.ToolsWrite}>
                  <DropdownMenuSeparator />
                  {tool.is_active ? (
                    onDeactivate && (
                      <DropdownMenuItem
                        onClick={() => onDeactivate(tool)}
                        className="text-amber-500"
                      >
                        <PowerOff className="mr-2 h-4 w-4" />
                        Deactivate
                      </DropdownMenuItem>
                    )
                  ) : (
                    onActivate && (
                      <DropdownMenuItem
                        onClick={() => onActivate(tool)}
                        className="text-green-500"
                      >
                        <Power className="mr-2 h-4 w-4" />
                        Activate
                      </DropdownMenuItem>
                    )
                  )}
                </Can>
              )}
              {!readOnly && !tool.is_builtin && onDelete && (
                <Can permission={Permission.ToolsDelete}>
                  <DropdownMenuItem
                    onClick={() => onDelete(tool)}
                    className="text-red-500"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </Can>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tool.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {tool.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={cn('text-xs', getCategoryBadgeColor(categoryName))}
          >
            {categoryDisplayName}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {INSTALL_METHOD_DISPLAY_NAMES[tool.install_method]}
          </Badge>
          {tool.is_builtin && (
            <Badge variant="outline" className="text-xs">
              Built-in
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {tool.has_update && (
              <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs"
              >
                <ArrowUpCircle className="mr-1 h-3 w-3" />
                Update
              </Badge>
            )}
          </div>
          {/* Show switch for custom tools only - platform tools show status on icon */}
          {!readOnly && (onActivate || onDeactivate) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {tool.is_active ? 'Active' : 'Inactive'}
              </span>
              <Switch
                checked={tool.is_active}
                onCheckedChange={() =>
                  tool.is_active ? onDeactivate?.(tool) : onActivate?.(tool)
                }
                onClick={(e) => e.stopPropagation()}
                disabled={!canWriteTools}
              />
            </div>
          )}
        </div>

        {tool.capabilities && tool.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tool.capabilities.slice(0, 3).map((cap) => (
              <Badge key={cap} variant="outline" className="text-xs font-normal">
                {cap}
              </Badge>
            ))}
            {tool.capabilities.length > 3 && (
              <Badge variant="outline" className="text-xs font-normal">
                +{tool.capabilities.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
