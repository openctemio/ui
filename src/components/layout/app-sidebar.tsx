"use client";

import { useLayout } from "@/context/layout-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
// Use centralized sidebar data from features
import { sidebarData } from "@/config/sidebar-data";
import { useFilteredSidebarData } from "@/lib/permissions";
import { NavGroup } from "./nav-group";
import { SidebarUser } from "./sidebar-user";
import { TeamSwitcher } from "./team-switcher";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export function AppSidebar() {
  const { collapsible, variant } = useLayout();
  // Filter sidebar items based on user permissions and modules
  const { data: filteredSidebarData, isModulesLoading } = useFilteredSidebarData(sidebarData);

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      {/* Header - Team Switcher */}
      <SidebarHeader>
        <TeamSwitcher />
        <Separator orientation="horizontal" />
      </SidebarHeader>

      {/* Content */}
      <SidebarContent>
        {isModulesLoading ? (
          // Show skeleton while modules are loading
          <div className="space-y-4 px-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : (
          filteredSidebarData.navGroups.map((group) => (
            <NavGroup key={group.title} {...group} />
          ))
        )}
      </SidebarContent>

      <Separator orientation="horizontal" />

      {/* Footer - User profile and logout */}
      <SidebarFooter>
        <SidebarUser />
      </SidebarFooter>

      {/* Sidebar toggle rail */}
      <SidebarRail />
    </Sidebar>
  );
}