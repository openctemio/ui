"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Fragment } from "react";

// Route labels mapping - add more as needed
const routeLabels: Record<string, string> = {
  // Main sections
  "": "Dashboard",
  "asset-groups": "Asset Groups",
  findings: "Findings",
  reports: "Reports",

  // Scoping
  scoping: "Scoping",
  "attack-surface": "Attack Surface",
  "scope-config": "Scope Configuration",

  // Discovery
  discovery: "Discovery",
  scans: "Scan Management",
  assets: "Asset Inventory",
  domains: "Domains",
  websites: "Websites",
  services: "Services",
  repositories: "Repositories",
  cloud: "Cloud Assets",
  credentials: "Credential Leaks",

  // Prioritization
  prioritization: "Prioritization",
  "risk-analysis": "Risk Analysis",
  "business-impact": "Business Impact",

  // Validation
  validation: "Validation",
  "attack-simulation": "Attack Simulation",
  "control-testing": "Control Testing",

  // Mobilization
  mobilization: "Mobilization",
  remediation: "Remediation Tasks",
  workflows: "Workflows",

  // Settings
  settings: "Settings",
  users: "Users",
  integrations: "Integrations",
  runners: "Runners",
  tenant: "Tenant",
};

// UUID regex pattern to detect dynamic route segments
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Check if a segment looks like an ID (UUID or other ID formats)
function isIdSegment(segment: string): boolean {
  // Check for UUID format
  if (UUID_PATTERN.test(segment)) return true;
  // Check for other common ID patterns (hex strings, numeric IDs)
  if (/^[0-9a-f]{24}$/i.test(segment)) return true; // MongoDB ObjectId
  if (/^[0-9]+$/.test(segment) && segment.length > 5) return true; // Long numeric IDs
  return false;
}

interface BreadcrumbNavProps {
  /** Override the auto-generated page title */
  pageTitle?: string;
  /** Custom className for the breadcrumb container */
  className?: string;
  /** Hide the last segment if it's an ID (useful for detail pages with back button) */
  hideIdSegment?: boolean;
}

export function BreadcrumbNav({ pageTitle, className, hideIdSegment = true }: BreadcrumbNavProps) {
  const pathname = usePathname();

  // Split pathname and filter empty strings
  const segments = pathname.split("/").filter(Boolean);

  // If we're on the home page, don't show breadcrumb
  if (segments.length === 0) {
    return null;
  }

  // Build breadcrumb items with accumulated paths
  // Filter out ID segments from the end if hideIdSegment is true
  const filteredSegments = [...segments];
  if (hideIdSegment) {
    // Remove trailing ID segments (e.g., /asset-groups/[uuid] -> /asset-groups)
    while (filteredSegments.length > 0 && isIdSegment(filteredSegments[filteredSegments.length - 1])) {
      filteredSegments.pop();
    }
  }

  // If all segments were IDs, show at least home
  if (filteredSegments.length === 0) {
    return null;
  }

  const breadcrumbItems = filteredSegments.map((segment, index) => {
    const path = "/" + filteredSegments.slice(0, index + 1).join("/");
    const label = routeLabels[segment] || segment.replace(/-/g, " ");
    const isLast = index === filteredSegments.length - 1;

    return {
      path,
      label: isLast && pageTitle ? pageTitle : label,
      isLast,
    };
  });

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {/* Home link */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span className="sr-only">Dashboard</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbItems.map((item) => (
          <Fragment key={item.path}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage className="max-w-[200px] truncate capitalize">
                  {item.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link
                    href={item.path}
                    className="max-w-[150px] truncate capitalize"
                  >
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
