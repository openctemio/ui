'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, BookOpen, ChevronRight, Laptop, Moon, Sun } from 'lucide-react'
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
import { DOCS_URL } from '@/config/help-links'
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
                    <React.Fragment key={`${navItem.url}-${i}`}>
                      <CommandItem
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
                      {/* In-page section tabs (e.g. Exposures > Secrets): not
                          sidebar rows, but still reachable from search. The tab
                          at the item's own url is the item itself. */}
                      {navItem.sections
                        ?.filter((section) => section.href !== navItem.url)
                        .map((section) => (
                          <CommandItem
                            key={section.href}
                            // Label first so "secrets" ranks it as a label
                            // match; the section name is a keyword.
                            value={`${section.label} (${navItem.title})`}
                            keywords={[navItem.title]}
                            onSelect={() => {
                              runCommand(() => router.push(section.href))
                            }}
                          >
                            <div className="flex size-4 items-center justify-center">
                              <ArrowRight className="text-muted-foreground/80 size-2" />
                            </div>
                            {navItem.title} <ChevronRight /> {section.label}
                          </CommandItem>
                        ))}
                    </React.Fragment>
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
            {/* The overview, which the sidebar footer's Settings row opens. */}
            <CommandItem
              value={t('nav.item.settings', 'Settings')}
              keywords={['Settings']}
              onSelect={() => {
                runCommand(() => router.push('/settings'))
              }}
            >
              <div className="flex size-4 items-center justify-center">
                <ArrowRight className="text-muted-foreground/80 size-2" />
              </div>
              {t('nav.item.settings', 'Settings')}
            </CommandItem>
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
          <CommandGroup heading={t('help.menu', 'Help')}>
            <CommandItem
              value={t('help.documentation', 'Documentation')}
              keywords={['Help', 'Docs']}
              onSelect={() => {
                runCommand(() => window.open(DOCS_URL, '_blank', 'noopener,noreferrer'))
              }}
            >
              <BookOpen />
              <span>{t('help.documentation', 'Documentation')}</span>
            </CommandItem>
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
