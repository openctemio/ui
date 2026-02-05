'use client'

import { useState, useMemo } from 'react'
import {
  Radar,
  Search,
  Globe,
  Server,
  Shield,
  FileSearch,
  Bug,
  Network,
  Fingerprint,
  ChevronDown,
  ChevronRight,
  SearchIcon,
  Loader2,
  AlertCircle,
  Wrench,
  Code,
  Container,
  Key,
  FileCode,
  Scan,
  Cloud,
  User,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useToolsWithConfig } from '@/lib/api/tool-hooks'
import { useCapabilityMetadata } from '@/lib/api'
import type { ToolWithConfig } from '@/lib/api/tool-types'

// Map Lucide icon names from database to actual components
const ICON_MAP: Record<string, React.ElementType> = {
  code: Code,
  package: FileCode,
  globe: Globe,
  key: Key,
  server: Server,
  box: Container,
  search: Search,
  eye: Search,
  bug: Bug,
  radar: Radar,
  scan: Scan,
  fingerprint: Fingerprint,
  network: Network,
  'file-search': FileSearch,
  'file-code': FileCode,
  shield: Shield,
  wrench: Wrench,
}

// Get icon from category (dynamic from database) or fallback
function getIconForTool(tool: ToolWithConfig['tool']): React.ElementType {
  // Use category icon from database if available
  if (tool.category?.icon) {
    const icon = ICON_MAP[tool.category.icon]
    if (icon) return icon
  }
  // Fallback to generic scanner
  return Radar
}

// Map color names from database to Tailwind classes
const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-600',
  purple: 'bg-purple-600',
  green: 'bg-green-600',
  red: 'bg-red-600',
  orange: 'bg-orange-600',
  cyan: 'bg-cyan-600',
  yellow: 'bg-yellow-600',
  pink: 'bg-pink-600',
  indigo: 'bg-indigo-600',
  violet: 'bg-violet-600',
  emerald: 'bg-emerald-600',
  amber: 'bg-amber-600',
  slate: 'bg-slate-600',
  gray: 'bg-gray-600',
}

// Get color from category (dynamic from database) or fallback
function getColorForTool(tool: ToolWithConfig['tool']): string {
  // Use category color from database if available
  if (tool.category?.color) {
    const color = COLOR_MAP[tool.category.color]
    if (color) return color
  }
  return 'bg-slate-600'
}

// Group tools by their category (from embedded category info)
function groupToolsByCategory(tools: ToolWithConfig[]): Map<string, ToolWithConfig[]> {
  const groups = new Map<string, ToolWithConfig[]>()

  // Define category display order (slug -> display name fallback)
  const categoryOrder = [
    'sast',
    'sca',
    'dast',
    'secrets',
    'iac',
    'container',
    'recon',
    'osint',
  ]

  // First pass: collect all unique categories and their display names
  const categoryDisplayNames = new Map<string, string>()
  tools.forEach((toolWithConfig) => {
    const cat = toolWithConfig.tool.category
    if (cat) {
      categoryDisplayNames.set(cat.name, cat.display_name)
    }
  })

  // Initialize groups in order
  categoryOrder.forEach((slug) => {
    const displayName = categoryDisplayNames.get(slug)
    if (displayName) {
      groups.set(displayName, [])
    }
  })
  groups.set('Other', [])

  // Group tools by category
  tools.forEach((toolWithConfig) => {
    const cat = toolWithConfig.tool.category
    if (cat && categoryDisplayNames.has(cat.name)) {
      const displayName = categoryDisplayNames.get(cat.name)!
      if (!groups.has(displayName)) {
        groups.set(displayName, [])
      }
      groups.get(displayName)!.push(toolWithConfig)
    } else {
      groups.get('Other')!.push(toolWithConfig)
    }
  })

  // Remove empty groups
  groups.forEach((tools, key) => {
    if (tools.length === 0) {
      groups.delete(key)
    }
  })

  return groups
}

interface NodePaletteProps {
  onDragStart?: (event: React.DragEvent, nodeType: string, capabilities?: string[]) => void
  position?: 'left' | 'right'
}

export function NodePalette({ onDragStart, position = 'right' }: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Fetch capability metadata for display names
  const { getDisplayName: getCapabilityDisplayName } = useCapabilityMetadata()

  // Fetch tools from API
  const { data: toolsData, isLoading, error } = useToolsWithConfig({
    is_active: true,
    per_page: 100,
  })

  // Filter only enabled tools
  const enabledTools = useMemo(() => {
    if (!toolsData?.items) return []
    return toolsData.items.filter((t) => t.is_enabled && t.tool.is_active)
  }, [toolsData])

  // Group tools by category
  const groupedTools = useMemo(() => {
    return groupToolsByCategory(enabledTools)
  }, [enabledTools])

  // Categories start collapsed by default - no initialization needed
  // User can expand categories as needed

  const handleDragStart = (event: React.DragEvent, toolWithConfig: ToolWithConfig) => {
    const tool = toolWithConfig.tool
    // Store tool data for drop handler
    event.dataTransfer.setData('application/reactflow', 'scanner')
    event.dataTransfer.setData('application/node-label', tool.display_name || tool.name)
    event.dataTransfer.setData('application/node-capabilities', JSON.stringify(tool.capabilities || []))
    event.dataTransfer.setData('application/tool-name', tool.name)
    event.dataTransfer.setData('application/tool-id', tool.id)
    // Pass category color for node styling
    if (tool.category?.color) {
      event.dataTransfer.setData('application/category-color', tool.category.color)
    }
    event.dataTransfer.effectAllowed = 'move'
    onDragStart?.(event, 'scanner', tool.capabilities)
  }

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName)
      } else {
        newSet.add(categoryName)
      }
      return newSet
    })
  }

  // Filter tools by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groupedTools

    const filtered = new Map<string, ToolWithConfig[]>()

    groupedTools.forEach((tools, category) => {
      const matchingTools = tools.filter((t) => {
        const tool = t.tool
        const searchLower = searchQuery.toLowerCase()
        return (
          tool.name.toLowerCase().includes(searchLower) ||
          tool.display_name.toLowerCase().includes(searchLower) ||
          tool.description?.toLowerCase().includes(searchLower) ||
          tool.capabilities?.some((c) => c.toLowerCase().includes(searchLower))
        )
      })

      if (matchingTools.length > 0) {
        filtered.set(category, matchingTools)
      }
    })

    return filtered
  }, [groupedTools, searchQuery])

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'w-60 bg-muted/30 h-full flex flex-col items-center justify-center',
          position === 'left' ? 'border-r' : 'border-l'
        )}
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground mt-2">Loading tools...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          'w-60 bg-muted/30 h-full flex flex-col items-center justify-center p-4',
          position === 'left' ? 'border-r' : 'border-l'
        )}
      >
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-xs text-muted-foreground mt-2 text-center">Failed to load tools</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'w-60 bg-muted/30 h-full flex flex-col',
        position === 'left' ? 'border-r' : 'border-l'
      )}
    >
      {/* Header */}
      <div className="p-3 border-b">
        <h4 className="text-sm font-semibold mb-2">Scanner Tools</h4>
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          {enabledTools.length} tools available
        </p>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredGroups.size === 0 ? (
          <div className="text-center py-8">
            <Wrench className="h-8 w-8 text-muted-foreground/50 mx-auto" />
            <p className="text-xs text-muted-foreground mt-2">
              {searchQuery ? 'No tools match your search' : 'No tools enabled'}
            </p>
          </div>
        ) : (
          Array.from(filteredGroups.entries()).map(([category, tools]) => {
            const isExpanded = expandedCategories.has(category)

            return (
              <div key={category}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 text-sm font-medium"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="truncate">{category}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {tools.length}
                  </span>
                </button>

                {/* Tools in Category */}
                {isExpanded && (
                  <div className="ml-2 mt-1 space-y-1">
                    {tools.map((toolWithConfig) => {
                      const tool = toolWithConfig.tool
                      const Icon = getIconForTool(tool)
                      const iconBg = getColorForTool(tool)
                      const isAvailable = toolWithConfig.is_available

                      return (
                        <div
                          key={tool.id}
                          draggable={isAvailable}
                          onDragStart={(e) => isAvailable && handleDragStart(e, toolWithConfig)}
                          className={cn(
                            'flex items-center gap-2.5 px-2 py-2 rounded-lg border border-transparent bg-card transition-all',
                            isAvailable
                              ? 'hover:border-border hover:shadow-sm cursor-grab active:cursor-grabbing'
                              : 'opacity-50 cursor-not-allowed'
                          )}
                          title={
                            isAvailable
                              ? tool.description
                              : `${tool.display_name || tool.name} - No agent available`
                          }
                        >
                          {tool.logo_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={tool.logo_url}
                              alt={tool.display_name}
                              className={cn(
                                'h-8 w-8 rounded-lg object-contain bg-white p-0.5',
                                !isAvailable && 'grayscale'
                              )}
                            />
                          ) : (
                            <div
                              className={cn(
                                'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm',
                                isAvailable ? iconBg : 'bg-muted'
                              )}
                            >
                              <Icon className={cn('h-4 w-4', isAvailable ? 'text-white' : 'text-muted-foreground')} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className={cn(
                                'text-xs font-medium leading-tight truncate',
                                !isAvailable && 'text-muted-foreground'
                              )}>
                                {tool.display_name || tool.name}
                              </span>
                              {/* Show badge for platform vs custom tools */}
                              {tool.is_platform_tool ? (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/15 text-blue-600 font-medium shrink-0 flex items-center gap-0.5">
                                  <Cloud className="h-2.5 w-2.5" />
                                  Platform
                                </span>
                              ) : (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-600 font-medium shrink-0 flex items-center gap-0.5">
                                  <User className="h-2.5 w-2.5" />
                                  Custom
                                </span>
                              )}
                              {/* Show badge for unavailable tools */}
                              {!isAvailable && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/15 text-red-600 font-medium shrink-0">
                                  No Agent
                                </span>
                              )}
                            </div>
                            {tool.capabilities && tool.capabilities.length > 0 && (
                              <span className="text-[10px] text-muted-foreground leading-tight">
                                {tool.capabilities.slice(0, 2).map(c => getCapabilityDisplayName(c)).join(', ')}
                                {tool.capabilities.length > 2 && '...'}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer Tips */}
      <div className="p-3 border-t bg-muted/20">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Drag tools to canvas. Connect to create dependencies.
        </p>
      </div>
    </div>
  )
}
