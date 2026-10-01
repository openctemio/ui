'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ChevronRight, Laptop, Moon, Sun } from 'lucide-react'
import { useSearch } from '@/context/search-provider'
import { useTheme } from 'next-themes'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
// Use centralized sidebar data from features
import { sidebarData } from '@/config/sidebar-data'
import { useFilteredSidebarData } from '@/lib/permissions'
import { useSettingsNav } from '@/hooks/use-settings-nav'
import { useTranslation } from '@/context/i18n-provider'
import { commandFilter } from '@/lib/command-filter'
import { ScrollArea } from './ui/scroll-area'

export function CommandMenu() {
  const router = useRouter()
  const { setTheme } = useTheme()
  const { open, setOpen } = useSearch()

  // Filter sidebar data based on user permissions and modules
  const { data: filteredSidebarData } = useFilteredSidebarData(sidebarData)
  // Settings pages live in their own nav (the settings rail), not in
  // sidebarData, so index them here or they vanish from search.
  const settingsGroups = useSettingsNav()
  const { t } = useTranslation()

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      command()
    },
    [setOpen]
  )

  return (
    <CommandDialog modal open={open} onOpenChange={setOpen} filter={commandFilter}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <ScrollArea type="hover" className="h-72 pe-1">
          <CommandEmpty>No results found.</CommandEmpty>
          {filteredSidebarData.navGroups.map((group, gi) => (
            <CommandGroup key={group.title || `untitled-${gi}`} heading={group.title}>
              {group.items.map((navItem, i) => {
                if ('url' in navItem)
                  return (
                    <CommandItem
                      key={`${navItem.url}-${i}`}
                      value={navItem.title}
                      onSelect={() => {
                        runCommand(() => router.push(navItem.url.toString()))
                      }}
                    >
                      <div className="flex size-4 items-center justify-center">
                        <ArrowRight className="text-muted-foreground/80 size-2" />
                      </div>
                      {navItem.title}
                    </CommandItem>
                  )

                return navItem.items?.map((subItem, i) => (
                  <CommandItem
                    key={`${navItem.title}-${subItem.url}-${i}`}
                    value={`${navItem.title}-${subItem.url}`}
                    onSelect={() => {
                      runCommand(() => router.push(subItem.url.toString()))
                    }}
                  >
                    <div className="flex size-4 items-center justify-center">
                      <ArrowRight className="text-muted-foreground/80 size-2" />
                    </div>
                    {navItem.title} <ChevronRight /> {subItem.title}
                  </CommandItem>
                ))
              })}
            </CommandGroup>
          ))}
          <CommandGroup heading={t('nav.item.settings', 'Settings')}>
            {settingsGroups.flatMap((group) =>
              group.items.map((item) => (
                <CommandItem
                  key={`settings-${item.id}`}
                  // The label alone, plus the group and search keywords: cmdk
                  // matches fuzzily, so a url or a description in the value
                  // makes nearly every item match every query.
                  value={`${item.label} (${group.label})`}
                  keywords={[item.title, group.title, ...(item.keywords ?? [])]}
                  onSelect={() => {
                    runCommand(() => router.push(item.url))
                  }}
                >
                  <div className="flex size-4 items-center justify-center">
                    <ArrowRight className="text-muted-foreground/80 size-2" />
                  </div>
                  {group.label} <ChevronRight /> {item.label}
                </CommandItem>
              ))
            )}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => runCommand(() => setTheme('light'))}>
              <Sun /> <span>Light</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme('dark'))}>
              <Moon className="scale-90" />
              <span>Dark</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme('system'))}>
              <Laptop />
              <span>System</span>
            </CommandItem>
          </CommandGroup>
        </ScrollArea>
      </CommandList>
    </CommandDialog>
  )
}
