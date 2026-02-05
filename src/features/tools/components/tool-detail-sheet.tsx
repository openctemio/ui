'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Settings,
  Trash2,
  ExternalLink,
  Github,
  Power,
  PowerOff,
  ArrowUpCircle,
  Clock,
  Copy,
  Check,
  Terminal,
  Target,
  FileOutput,
  Tag,
  Zap,
  Info,
  Package,
  Layers,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { Tool } from '@/lib/api/tool-types';
import type { ToolCategory } from '@/lib/api/tool-category-types';
import { INSTALL_METHOD_DISPLAY_NAMES } from '@/lib/api/tool-types';
import { getCategoryNameById, getCategoryDisplayNameById } from '@/lib/api/tool-category-hooks';
import { CapabilityBadge } from '@/components/capability-badge';
import { ToolCategoryIcon, getCategoryBadgeColor } from './tool-category-icon';

interface ToolDetailSheetProps {
  tool: Tool | null;
  categories?: ToolCategory[]; // For looking up category name from category_id
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (tool: Tool) => void;
  onDelete?: (tool: Tool) => void;
  onActivate?: (tool: Tool) => void;
  onDeactivate?: (tool: Tool) => void;
  onCheckUpdate?: (tool: Tool) => void;
  /** When true, hides edit/delete/activate/deactivate actions (for platform tools) */
  readOnly?: boolean;
}

function CommandBlock({ label, command }: { label: string; command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="relative">
        <div className="rounded-lg bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-800 border-b border-zinc-800">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
          </div>
          <code className="block px-3 py-2.5 pr-10 text-xs font-mono text-zinc-300 break-all">
            <span className="text-green-400 select-none">$ </span>
            {command}
          </code>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 bottom-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-zinc-400" />
          )}
        </Button>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <h4 className="text-sm font-semibold">{title}</h4>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background border">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="font-medium text-sm truncate">{value}</div>
      </div>
    </div>
  );
}

export function ToolDetailSheet({
  tool,
  categories,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onCheckUpdate,
  readOnly = false,
}: ToolDetailSheetProps) {
  if (!tool) return null;

  // Look up category name from category_id
  const categoryName = getCategoryNameById(categories, tool.category_id);
  const categoryDisplayName = getCategoryDisplayNameById(categories, tool.category_id);

  const hasActions =
    !readOnly && (onActivate || onDeactivate || onEdit || onDelete || onCheckUpdate);
  const hasCommands = tool.install_cmd || tool.version_cmd || tool.update_cmd;
  const hasLinks = tool.docs_url || tool.github_url;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto p-0">
        {/* Hero Header */}
        <div className="relative">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />

          <SheetHeader className="relative p-6 pb-4">
            <div className="flex items-start gap-4">
              {/* Tool Icon */}
              <div className="relative">
                {tool.logo_url ? (
                  <div className="h-16 w-16 rounded-2xl bg-background border-2 border-border/50 shadow-lg p-2 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tool.logo_url}
                      alt={tool.display_name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-background border-2 border-border/50 shadow-lg flex items-center justify-center">
                    <ToolCategoryIcon
                      category={categoryName}
                      className="h-8 w-8 text-primary"
                    />
                  </div>
                )}
                {/* Status indicator */}
                <div
                  className={cn(
                    'absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-background flex items-center justify-center',
                    tool.is_active ? 'bg-green-500' : 'bg-zinc-400'
                  )}
                >
                  <Power className="h-2.5 w-2.5 text-white" />
                </div>
              </div>

              {/* Tool Info */}
              <div className="flex-1 min-w-0 pt-1">
                <SheetTitle className="text-xl font-bold">
                  {tool.display_name}
                </SheetTitle>
                <p className="text-sm text-muted-foreground font-mono mt-0.5">
                  {tool.name}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  <Badge
                    variant={tool.is_active ? 'default' : 'secondary'}
                    className={cn(
                      'text-xs font-medium',
                      tool.is_active &&
                        'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30 hover:bg-green-500/20'
                    )}
                  >
                    <span
                      className={cn(
                        'mr-1.5 h-1.5 w-1.5 rounded-full',
                        tool.is_active ? 'bg-green-500 animate-pulse' : 'bg-zinc-400'
                      )}
                    />
                    {tool.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {tool.is_builtin && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                    >
                      Built-in
                    </Badge>
                  )}
                  {tool.has_update && (
                    <Badge
                      variant="outline"
                      className="text-xs border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    >
                      <ArrowUpCircle className="mr-1 h-3 w-3" />
                      Update Available
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Actions */}
        {hasActions && (
          <div className="px-6 pb-4">
            <div className="flex flex-wrap gap-2">
              {(onActivate || onDeactivate) &&
                (tool.is_active
                  ? onDeactivate && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => onDeactivate(tool)}
                      >
                        <PowerOff className="h-3.5 w-3.5" />
                        Deactivate
                      </Button>
                    )
                  : onActivate && (
                      <Button
                        size="sm"
                        className="gap-1.5 bg-green-600 hover:bg-green-700"
                        onClick={() => onActivate(tool)}
                      >
                        <Power className="h-3.5 w-3.5" />
                        Activate
                      </Button>
                    ))}
              {!tool.is_builtin && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => onEdit(tool)}
                >
                  <Settings className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
              {tool.has_update && onCheckUpdate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  onClick={() => onCheckUpdate(tool)}
                >
                  <ArrowUpCircle className="h-3.5 w-3.5" />
                  Update
                </Button>
              )}
              {!tool.is_builtin && onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-red-500 hover:text-red-500 hover:bg-red-500/10 border-red-500/30"
                  onClick={() => onDelete(tool)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6 border-t bg-muted/30">
          {/* Description */}
          {tool.description && (
            <div className="rounded-lg bg-background border p-4">
              <div className="flex gap-3">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {tool.description}
                </p>
              </div>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard
              label="Category"
              icon={Layers}
              value={
                <Badge
                  variant="outline"
                  className={cn('text-xs', getCategoryBadgeColor(categoryName))}
                >
                  <ToolCategoryIcon
                    category={categoryName}
                    className="mr-1 h-3 w-3"
                  />
                  {categoryDisplayName}
                </Badge>
              }
            />
            <InfoCard
              label="Install Method"
              icon={Package}
              value={INSTALL_METHOD_DISPLAY_NAMES[tool.install_method]}
            />
            <InfoCard
              label="Version"
              icon={Tag}
              value={
                <div className="flex items-center gap-1.5">
                  <span>{tool.current_version || 'Not installed'}</span>
                  {tool.has_update && tool.latest_version && (
                    <span className="text-xs text-amber-500 font-normal">
                      ({tool.latest_version})
                    </span>
                  )}
                </div>
              }
            />
            <InfoCard
              label="Type"
              icon={Zap}
              value={tool.is_builtin ? 'Built-in' : 'Custom'}
            />
          </div>

          {/* Commands */}
          {hasCommands && (
            <div className="space-y-4">
              <SectionHeader icon={Terminal} title="Commands" />
              <div className="space-y-4">
                {tool.install_cmd && (
                  <CommandBlock label="Install" command={tool.install_cmd} />
                )}
                {tool.version_cmd && (
                  <CommandBlock label="Version Check" command={tool.version_cmd} />
                )}
                {tool.update_cmd && (
                  <CommandBlock label="Update" command={tool.update_cmd} />
                )}
              </div>
            </div>
          )}

          {/* Capabilities */}
          {tool.capabilities && tool.capabilities.length > 0 && (
            <div>
              <SectionHeader icon={Zap} title="Capabilities" />
              <div className="flex flex-wrap gap-2">
                {tool.capabilities.map((cap) => (
                  <CapabilityBadge key={cap} name={cap} showIcon />
                ))}
              </div>
            </div>
          )}

          {/* Supported Targets */}
          {tool.supported_targets && tool.supported_targets.length > 0 && (
            <div>
              <SectionHeader icon={Target} title="Supported Targets" />
              <div className="flex flex-wrap gap-2">
                {tool.supported_targets.map((target) => (
                  <Badge
                    key={target}
                    variant="secondary"
                    className="text-xs font-normal"
                  >
                    {target}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Output Formats */}
          {tool.output_formats && tool.output_formats.length > 0 && (
            <div>
              <SectionHeader icon={FileOutput} title="Output Formats" />
              <div className="flex flex-wrap gap-2">
                {tool.output_formats.map((format) => (
                  <Badge
                    key={format}
                    variant="outline"
                    className="text-xs font-normal bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30"
                  >
                    {format}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {tool.tags && tool.tags.length > 0 && (
            <div>
              <SectionHeader icon={Tag} title="Tags" />
              <div className="flex flex-wrap gap-2">
                {tool.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs font-normal">
                    # {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {hasLinks && (
            <div className="flex flex-wrap gap-2 pt-2">
              {tool.docs_url && (
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href={tool.docs_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Documentation
                  </a>
                </Button>
              )}
              {tool.github_url && (
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href={tool.github_url} target="_blank" rel="noopener noreferrer">
                    <Github className="h-3.5 w-3.5" />
                    GitHub
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer - Timestamps */}
        <div className="px-6 py-4 border-t bg-muted/50 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              Created{' '}
              {new Date(tool.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Updated{' '}
              {new Date(tool.updated_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
