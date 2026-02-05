/**
 * Edit Group Dialog
 *
 * Modern dialog for editing asset group metadata with visual selectors
 * matching the Create wizard for UI consistency.
 *
 * Asset management is handled separately in the Assets tab for better UX.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Loader2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Environment, Criticality } from "@/features/shared/types";
import type { AssetGroup } from "../../types";

interface EditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: AssetGroup;
  onSubmit: (data: EditGroupFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export interface EditGroupFormData {
  name: string;
  description: string;
  environment: Environment;
  criticality: Criticality;
  businessUnit: string;
  owner: string;
  ownerEmail: string;
  tags: string[];
}

const ENVIRONMENTS: {
  value: Environment;
  label: string;
  icon: typeof Server;
  color: string;
}[] = [
  {
    value: "production",
    label: "Production",
    icon: Server,
    color:
      "text-red-500 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900",
  },
  {
    value: "staging",
    label: "Staging",
    icon: FlaskConical,
    color:
      "text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900",
  },
  {
    value: "development",
    label: "Development",
    icon: Code,
    color:
      "text-blue-500 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900",
  },
  {
    value: "testing",
    label: "Testing",
    icon: TestTube,
    color:
      "text-green-500 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900",
  },
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
    description: "Business critical - immediate response",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bgColor:
      "border-red-200 bg-red-50/50 hover:bg-red-50 dark:border-red-900 dark:bg-red-950/20 dark:hover:bg-red-950/40",
  },
  {
    value: "high",
    label: "High",
    description: "Important functions - prioritized",
    icon: AlertCircle,
    color: "text-orange-600 dark:text-orange-400",
    bgColor:
      "border-orange-200 bg-orange-50/50 hover:bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20 dark:hover:bg-orange-950/40",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Standard operations - normal",
    icon: Info,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor:
      "border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/40",
  },
  {
    value: "low",
    label: "Low",
    description: "Non-essential - scheduled",
    icon: MinusCircle,
    color: "text-slate-500 dark:text-slate-400",
    bgColor:
      "border-slate-200 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20 dark:hover:bg-slate-900/40",
  },
];

const SUGGESTED_BUSINESS_UNITS = [
  "Technology & Engineering",
  "Platform Engineering",
  "Infrastructure & Operations",
  "Digital Commerce",
  "Finance",
  "Human Resources",
];

const SUGGESTED_TAGS = [
  "tier-1",
  "tier-2",
  "customer-facing",
  "internal",
  "pci-dss",
  "gdpr",
];

export function EditGroupDialog({
  open,
  onOpenChange,
  group,
  onSubmit,
  isSubmitting = false,
}: EditGroupDialogProps) {
  const [formData, setFormData] = useState<EditGroupFormData>({
    name: "",
    description: "",
    environment: "production",
    criticality: "medium",
    businessUnit: "",
    owner: "",
    ownerEmail: "",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [businessContextOpen, setBusinessContextOpen] = useState(false);

  // Sync form data when group changes or dialog opens
  useEffect(() => {
    if (open && group) {
      setFormData({
        name: group.name,
        description: group.description || "",
        environment: group.environment as Environment,
        criticality: group.criticality as Criticality,
        businessUnit: group.businessUnit || "",
        owner: group.owner || "",
        ownerEmail: group.ownerEmail || "",
        tags: group.tags || [],
      });
      // Auto-expand business context if has data
      setBusinessContextOpen(
        !!(group.businessUnit || group.owner || group.ownerEmail || group.tags?.length)
      );
    }
  }, [open, group]);

  const handleAddTag = useCallback(
    (tag: string) => {
      const normalizedTag = tag.trim().toLowerCase();
      if (normalizedTag && !formData.tags.includes(normalizedTag)) {
        setFormData((prev) => ({ ...prev, tags: [...prev.tags, normalizedTag] }));
      }
      setTagInput("");
    },
    [formData.tags]
  );

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  }, []);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        handleAddTag(tagInput);
      }
    },
    [tagInput, handleAddTag]
  );

  const handleSubmit = async () => {
    await onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b px-6 py-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                <Pencil className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">Edit Asset Group</DialogTitle>
                <DialogDescription className="text-sm">
                  Update group details and business context
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-6">
            {/* Group Identity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  Group Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-sm">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    placeholder="e.g., Payment Gateway Services"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description" className="text-sm">
                    Description
                  </Label>
                  <Textarea
                    id="edit-description"
                    placeholder="Describe the purpose and scope..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={2}
                    className="resize-none"
                    disabled={isSubmitting}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Environment Selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Environment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {ENVIRONMENTS.map((env) => {
                    const Icon = env.icon;
                    const isSelected = formData.environment === env.value;
                    return (
                      <button
                        key={env.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, environment: env.value }))
                        }
                        disabled={isSubmitting}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5 transition-all",
                          isSelected
                            ? cn(env.color, "border-current ring-1 ring-current/20")
                            : "border-muted bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                          isSubmitting && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            isSelected && env.color.split(" ")[0]
                          )}
                        />
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
                <CardTitle className="text-sm font-medium">Criticality</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {CRITICALITIES.map((crit) => {
                    const Icon = crit.icon;
                    const isSelected = formData.criticality === crit.value;
                    return (
                      <button
                        key={crit.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, criticality: crit.value }))
                        }
                        disabled={isSubmitting}
                        className={cn(
                          "flex items-start gap-2.5 rounded-lg border-2 p-2.5 text-left transition-all",
                          isSelected
                            ? cn(crit.bgColor, "ring-1 ring-current/20")
                            : "border-muted hover:border-muted-foreground/30",
                          isSubmitting && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                            isSelected ? crit.color : "text-muted-foreground"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={cn(
                              "font-medium text-sm",
                              isSelected ? crit.color : "text-foreground"
                            )}
                          >
                            {crit.label}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {crit.description}
                          </div>
                        </div>
                        {isSelected && (
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full shrink-0 mt-1",
                              crit.color.includes("red") && "bg-red-500",
                              crit.color.includes("orange") && "bg-orange-500",
                              crit.color.includes("yellow") && "bg-yellow-500",
                              crit.color.includes("slate") && "bg-slate-400"
                            )}
                          />
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
                        <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Building2 className="h-3.5 w-3.5 text-blue-500" />
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
                      <Label className="text-sm flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        Business Unit
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTED_BUSINESS_UNITS.map((bu) => (
                          <Badge
                            key={bu}
                            variant={formData.businessUnit === bu ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer transition-colors text-xs",
                              formData.businessUnit === bu ? "" : "hover:bg-muted",
                              isSubmitting && "pointer-events-none opacity-50"
                            )}
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                businessUnit: prev.businessUnit === bu ? "" : bu,
                              }))
                            }
                          >
                            {bu}
                          </Badge>
                        ))}
                      </div>
                      <Input
                        placeholder="Or enter custom..."
                        value={
                          SUGGESTED_BUSINESS_UNITS.includes(formData.businessUnit)
                            ? ""
                            : formData.businessUnit
                        }
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            businessUnit: e.target.value,
                          }))
                        }
                        disabled={isSubmitting}
                        className="mt-2"
                      />
                    </div>

                    {/* Owner & Email */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          Owner
                        </Label>
                        <Input
                          placeholder="e.g., Nguyen Van A"
                          value={formData.owner}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, owner: e.target.value }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          Email
                        </Label>
                        <Input
                          type="email"
                          placeholder="e.g., a.nguyen@company.vn"
                          value={formData.ownerEmail}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              ownerEmail: e.target.value,
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-2">
                        <Tags className="h-3.5 w-3.5 text-muted-foreground" />
                        Tags
                      </Label>
                      {formData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-lg">
                          {formData.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="gap-1 pl-2 pr-1 text-xs"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                disabled={isSubmitting}
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
                        disabled={isSubmitting}
                      />
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground mr-1 py-0.5">
                          Quick add:
                        </span>
                        {SUGGESTED_TAGS.filter((t) => !formData.tags.includes(t))
                          .slice(0, 4)
                          .map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className={cn(
                                "cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30 text-xs transition-colors",
                                isSubmitting && "pointer-events-none opacity-50"
                              )}
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
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="border-t bg-muted/30 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
