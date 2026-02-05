/**
 * Basic Info Step
 *
 * First step for entering group name, description, environment, criticality,
 * and business context (CTEM Scoping)
 *
 * Redesigned with card-based layout and visual selectors
 */

"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Building2,
  User,
  Mail,
  Tags,
  X,
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  Info,
  MinusCircle,
  Server,
  TestTube,
  Code,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreateGroupFormData } from "./types";
import type { Environment, Criticality } from "@/features/shared/types";

interface BasicInfoStepProps {
  data: CreateGroupFormData;
  onChange: (data: Partial<CreateGroupFormData>) => void;
}

const ENVIRONMENTS: {
  value: Environment;
  label: string;
  icon: typeof Server;
  color: string;
}[] = [
  { value: "production", label: "Production", icon: Server, color: "text-red-500 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900" },
  { value: "staging", label: "Staging", icon: FlaskConical, color: "text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900" },
  { value: "development", label: "Development", icon: Code, color: "text-blue-500 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900" },
  { value: "testing", label: "Testing", icon: TestTube, color: "text-green-500 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900" },
];

const CRITICALITIES: {
  value: Criticality;
  label: string;
  description: string;
  icon: typeof AlertTriangle;
  color: string;
  bgColor: string;
}[] = [
  {
    value: "critical",
    label: "Critical",
    description: "Business critical systems - immediate response required",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "border-red-200 bg-red-50/50 hover:bg-red-50 dark:border-red-900 dark:bg-red-950/20 dark:hover:bg-red-950/40",
  },
  {
    value: "high",
    label: "High",
    description: "Important business functions - prioritized attention",
    icon: AlertCircle,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "border-orange-200 bg-orange-50/50 hover:bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20 dark:hover:bg-orange-950/40",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Standard business operations - normal priority",
    icon: Info,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/40",
  },
  {
    value: "low",
    label: "Low",
    description: "Non-essential systems - scheduled maintenance",
    icon: MinusCircle,
    color: "text-slate-500 dark:text-slate-400",
    bgColor: "border-slate-200 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20 dark:hover:bg-slate-900/40",
  },
];

const SUGGESTED_BUSINESS_UNITS = [
  "Technology & Engineering",
  "Platform Engineering",
  "Infrastructure & Operations",
  "Digital Commerce",
  "Finance",
  "Human Resources",
  "Sales & Marketing",
  "Customer Support",
  "Legal & Compliance",
  "Research & Development",
];

const SUGGESTED_TAGS = [
  "tier-1",
  "tier-2",
  "tier-3",
  "customer-facing",
  "internal",
  "pci-dss",
  "gdpr",
  "hipaa",
  "soc2",
  "infrastructure",
  "application",
  "database",
  "api",
  "legacy",
];

export function BasicInfoStep({ data, onChange }: BasicInfoStepProps) {
  const [tagInput, setTagInput] = useState("");
  const [businessContextOpen, setBusinessContextOpen] = useState(true);

  const handleAddTag = useCallback(
    (tag: string) => {
      const normalizedTag = tag.trim().toLowerCase();
      if (normalizedTag && !data.tags.includes(normalizedTag)) {
        onChange({ tags: [...data.tags, normalizedTag] });
      }
      setTagInput("");
    },
    [data.tags, onChange]
  );

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      onChange({ tags: data.tags.filter((t) => t !== tagToRemove) });
    },
    [data.tags, onChange]
  );

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        handleAddTag(tagInput);
      }
    },
    [tagInput, handleAddTag]
  );

  return (
    <div className="space-y-4 p-6">
      {/* Group Identity Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            Group Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm">
              Group Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Payment Gateway Services"
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="h-10"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the purpose and scope of this asset group..."
              value={data.description}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={2}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Environment Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Environment <span className="text-destructive">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ENVIRONMENTS.map((env) => {
              const Icon = env.icon;
              const isSelected = data.environment === env.value;
              return (
                <button
                  key={env.value}
                  type="button"
                  onClick={() => onChange({ environment: env.value })}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all",
                    isSelected
                      ? cn(env.color, "border-current ring-1 ring-current/20")
                      : "border-muted bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isSelected && env.color.split(" ")[0])} />
                  <span className="text-xs font-medium">{env.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Criticality Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Criticality <span className="text-destructive">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CRITICALITIES.map((crit) => {
              const Icon = crit.icon;
              const isSelected = data.criticality === crit.value;
              return (
                <button
                  key={crit.value}
                  type="button"
                  onClick={() => onChange({ criticality: crit.value })}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all",
                    isSelected
                      ? cn(crit.bgColor, "ring-1 ring-current/20")
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <div className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    isSelected ? crit.color : "text-muted-foreground"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-medium text-sm",
                      isSelected ? crit.color : "text-foreground"
                    )}>
                      {crit.label}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {crit.description}
                    </div>
                  </div>
                  {isSelected && (
                    <div className={cn(
                      "h-2 w-2 rounded-full shrink-0 mt-1.5",
                      crit.color.includes("red") && "bg-red-500",
                      crit.color.includes("orange") && "bg-orange-500",
                      crit.color.includes("yellow") && "bg-yellow-500",
                      crit.color.includes("slate") && "bg-slate-400"
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Business Context - Collapsible */}
      <Collapsible open={businessContextOpen} onOpenChange={setBusinessContextOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-blue-500" />
                  </div>
                  Business Context
                  <Badge variant="outline" className="ml-2 text-xs font-normal">
                    Optional
                  </Badge>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    businessContextOpen && "rotate-180"
                  )}
                />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Business Unit */}
              <div className="space-y-2">
                <Label htmlFor="businessUnit" className="text-sm flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Business Unit
                </Label>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_BUSINESS_UNITS.slice(0, 6).map((bu) => (
                    <Badge
                      key={bu}
                      variant={data.businessUnit === bu ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-colors",
                        data.businessUnit === bu
                          ? ""
                          : "hover:bg-muted"
                      )}
                      onClick={() =>
                        onChange({ businessUnit: data.businessUnit === bu ? "" : bu })
                      }
                    >
                      {bu}
                    </Badge>
                  ))}
                </div>
                <Input
                  id="businessUnit"
                  placeholder="Or enter custom business unit..."
                  value={
                    SUGGESTED_BUSINESS_UNITS.includes(data.businessUnit)
                      ? ""
                      : data.businessUnit
                  }
                  onChange={(e) => onChange({ businessUnit: e.target.value })}
                  className="mt-2"
                />
              </div>

              {/* Owner & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="owner" className="text-sm flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Owner
                  </Label>
                  <Input
                    id="owner"
                    placeholder="e.g., Nguyen Van A"
                    value={data.owner}
                    onChange={(e) => onChange({ owner: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerEmail" className="text-sm flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Owner Email
                  </Label>
                  <Input
                    id="ownerEmail"
                    type="email"
                    placeholder="e.g., a.nguyen@company.vn"
                    value={data.ownerEmail}
                    onChange={(e) => onChange({ ownerEmail: e.target.value })}
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Tags className="h-3.5 w-3.5 text-muted-foreground" />
                  Tags
                </Label>
                {data.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-lg">
                    {data.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="gap-1 pl-2 pr-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <Input
                  placeholder="Type a tag and press Enter..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                />
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground mr-1 py-0.5">
                    Quick add:
                  </span>
                  {SUGGESTED_TAGS.filter((t) => !data.tags.includes(t))
                    .slice(0, 6)
                    .map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30 text-xs transition-colors"
                        onClick={() => handleAddTag(tag)}
                      >
                        + {tag}
                      </Badge>
                    ))}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
