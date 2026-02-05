"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  MoreHorizontal,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Eye,
  Network,
  Server,
  Globe,
  ShieldCheck,
  Cloud,
  Code,
  Plug,
  Key,
  Database,
  Settings,
  HelpCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type {
  ExposureEvent,
  ExposureEventType,
  ExposureSeverity,
  ExposureState,
} from "@/lib/api/exposure-types";

// Icon mapping for event types
const eventTypeIcons: Record<string, typeof Network> = {
  network: Network,
  service: Server,
  domain: Globe,
  certificate: ShieldCheck,
  cloud: Cloud,
  code: Code,
  api: Plug,
  credential: Key,
  data: Database,
  config: Settings,
  other: HelpCircle,
};

// Get icon for event type based on category
function getEventTypeIcon(eventType: ExposureEventType): typeof Network {
  const config = {
    port_open: "network",
    port_closed: "network",
    service_detected: "service",
    service_changed: "service",
    subdomain_discovered: "domain",
    subdomain_removed: "domain",
    certificate_expiring: "certificate",
    certificate_expired: "certificate",
    bucket_public: "cloud",
    bucket_private: "cloud",
    repo_public: "code",
    repo_private: "code",
    api_exposed: "api",
    api_removed: "api",
    credential_leaked: "credential",
    sensitive_data_exposed: "data",
    misconfiguration: "config",
    custom: "other",
  } as const;

  return eventTypeIcons[config[eventType]] || HelpCircle;
}

// Severity badge config
const severityConfig: Record<ExposureSeverity, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-red-500 text-white hover:bg-red-600" },
  high: { label: "High", className: "bg-orange-500 text-white hover:bg-orange-600" },
  medium: { label: "Medium", className: "bg-yellow-500 text-black hover:bg-yellow-600" },
  low: { label: "Low", className: "bg-blue-500 text-white hover:bg-blue-600" },
  info: { label: "Info", className: "bg-gray-500 text-white hover:bg-gray-600" },
};

// State badge config
const stateConfig: Record<ExposureState, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  accepted: { label: "Accepted", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  false_positive: { label: "False Positive", className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
};

// Event type labels
const eventTypeLabels: Record<ExposureEventType, string> = {
  port_open: "Port Open",
  port_closed: "Port Closed",
  service_detected: "Service Detected",
  service_changed: "Service Changed",
  subdomain_discovered: "Subdomain Discovered",
  subdomain_removed: "Subdomain Removed",
  certificate_expiring: "Certificate Expiring",
  certificate_expired: "Certificate Expired",
  bucket_public: "Bucket Public",
  bucket_private: "Bucket Private",
  repo_public: "Repository Public",
  repo_private: "Repository Private",
  api_exposed: "API Exposed",
  api_removed: "API Removed",
  credential_leaked: "Credential Leaked",
  sensitive_data_exposed: "Sensitive Data Exposed",
  misconfiguration: "Misconfiguration",
  custom: "Custom",
};

interface ExposureTableProps {
  exposures: ExposureEvent[];
  isLoading?: boolean;
  onResolve?: (exposure: ExposureEvent) => void;
  onAccept?: (exposure: ExposureEvent) => void;
  onMarkFalsePositive?: (exposure: ExposureEvent) => void;
  onReactivate?: (exposure: ExposureEvent) => void;
  onViewDetails?: (exposure: ExposureEvent) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  className?: string;
}

/**
 * Exposure Table - Displays list of exposure events with actions
 */
export function ExposureTable({
  exposures,
  isLoading,
  onResolve,
  onAccept,
  onMarkFalsePositive,
  onReactivate,
  onViewDetails,
  selectedIds = [],
  onSelectionChange,
  className,
}: ExposureTableProps) {
  const allSelected = exposures.length > 0 && selectedIds.length === exposures.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < exposures.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(exposures.map((e) => e.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange?.(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange?.([...selectedIds, id]);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("rounded-md border", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Type</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>First Seen</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={8}>
                  <div className="animate-pulse h-8 bg-muted rounded" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (exposures.length === 0) {
    return (
      <div className={cn("rounded-md border p-8 text-center", className)}>
        <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No exposures found</h3>
        <p className="text-sm text-muted-foreground">
          Your attack surface is looking clean!
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {onSelectionChange && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            <TableHead className="w-10">Type</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-24">Severity</TableHead>
            <TableHead className="w-28">State</TableHead>
            <TableHead className="w-28">Source</TableHead>
            <TableHead className="w-32">First Seen</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {exposures.map((exposure) => {
            const Icon = getEventTypeIcon(exposure.event_type);
            const severity = severityConfig[exposure.severity];
            const state = stateConfig[exposure.state];

            return (
              <TableRow
                key={exposure.id}
                className={cn(
                  selectedIds.includes(exposure.id) && "bg-muted/50",
                  "cursor-pointer hover:bg-muted/50"
                )}
                onClick={() => onViewDetails?.(exposure)}
              >
                {onSelectionChange && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(exposure.id)}
                      onCheckedChange={() => handleSelectOne(exposure.id)}
                      aria-label={`Select ${exposure.title}`}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="p-1.5 rounded bg-muted">
                          <Icon className="h-4 w-4" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {eventTypeLabels[exposure.event_type]}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium line-clamp-1">{exposure.title}</p>
                    {exposure.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {exposure.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={severity.className}>{severity.label}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={state.className}>
                    {state.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{exposure.source}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(exposure.first_seen_at), { addSuffix: true })}
                  </span>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetails?.(exposure)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {exposure.state === "active" && (
                        <>
                          <DropdownMenuItem onClick={() => onResolve?.(exposure)}>
                            <Check className="mr-2 h-4 w-4 text-green-500" />
                            Mark Resolved
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAccept?.(exposure)}>
                            <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" />
                            Accept Risk
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onMarkFalsePositive?.(exposure)}>
                            <X className="mr-2 h-4 w-4 text-gray-500" />
                            False Positive
                          </DropdownMenuItem>
                        </>
                      )}
                      {exposure.state !== "active" && (
                        <DropdownMenuItem onClick={() => onReactivate?.(exposure)}>
                          <RefreshCw className="mr-2 h-4 w-4 text-blue-500" />
                          Reactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
