"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Bot,
  Copy,
  Check,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { AgentTypeIcon } from "./agent-type-icon";
import { ToolSelection, type ToolOption } from "./tool-selection";
import {
  createAgentSchema,
  type CreateAgentFormData,
  AGENT_TYPE_OPTIONS,
  AGENT_EXECUTION_MODE_OPTIONS,
} from "../schemas/agent-schema";
import { useAgentFormOptions } from "../hooks";
import { useCreateAgent, invalidateAgentsCache } from "@/lib/api/agent-hooks";
import type { AgentType } from "@/lib/api/agent-types";

interface AddAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddAgentDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddAgentDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  const {
    toolOptions,
    isLoading: isLoadingOptions,
    error: optionsError,
    getCapabilitiesForTools,
  } = useAgentFormOptions();

  const { trigger: createAgent, isMutating } = useCreateAgent();

  const form = useForm<CreateAgentFormData>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      name: "",
      type: "worker",  // Default to daemon agent type
      description: "",
      capabilities: [],
      tools: [],
      execution_mode: "daemon",  // Default to daemon mode
    },
  });

  const watchedName = form.watch("name");
  const watchedType = form.watch("type");
  const canProceedToStep2 = watchedName?.trim().length > 0 && !!watchedType;

  // Convert toolOptions to the format expected by ToolSelection
  const toolSelectionOptions: ToolOption[] = toolOptions.map((t) => ({
    value: t.value,
    label: t.label,
    description: t.description,
    category: t.category,
  }));

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setApiKey(null);
      setCopied(false);
      setShowApiKey(false);
      setSelectedTools([]);
      form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleNextStep = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canProceedToStep2) {
      setStep(2);
    } else {
      form.trigger(["name", "type"]);
    }
  };

  const onSubmit = async (data: CreateAgentFormData) => {
    try {
      const capabilities = getCapabilitiesForTools(selectedTools);

      const result = await createAgent({
        name: data.name,
        type: data.type,
        description: data.description,
        capabilities: capabilities as never[],
        tools: selectedTools as never[],
        execution_mode: data.execution_mode,
      });

      toast.success(`Agent "${data.name}" created successfully`);
      await invalidateAgentsCache();

      if (result?.api_key) {
        setApiKey(result.api_key);
      } else {
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create agent"
      );
    }
  };

  const handleCopyApiKey = async () => {
    if (apiKey) {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.success("API key copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    form.reset();
    setStep(1);
    setApiKey(null);
    setCopied(false);
    setShowApiKey(false);
    setSelectedTools([]);
    onOpenChange(false);
    if (apiKey) {
      onSuccess?.();
    }
  };

  // Success view - API key display
  if (apiKey) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Agent Created Successfully
            </DialogTitle>
            <DialogDescription>
              Save this API key now. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                Important: Save your API key
              </p>
              <p className="text-xs text-muted-foreground">
                This API key will only be shown once. Please copy it and store it securely.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    readOnly
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    className="pr-10 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <Button variant="outline" size="icon" onClick={handleCopyApiKey}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Add Agent
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Configure the basic settings for your agent"
              : "Select the tools this agent will use"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
              step === 1
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            1
          </div>
          <div className="h-px w-8 bg-border" />
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
              step === 2
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            2
          </div>
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select agent type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AGENT_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <AgentTypeIcon type={option.value as AgentType} className="h-4 w-4" />
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Production Scanner" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Description <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder="What does this agent do?" className="resize-none" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="execution_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Execution Mode</FormLabel>
                    <div className="grid grid-cols-2 gap-3">
                      {AGENT_EXECUTION_MODE_OPTIONS.map((option) => (
                        <div
                          key={option.value}
                          onClick={() => field.onChange(option.value)}
                          className={cn(
                            "flex flex-col gap-1 rounded-lg border-2 p-3 cursor-pointer transition-colors",
                            field.value === option.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <span className="font-medium text-sm">{option.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.value === "standalone"
                              ? "Runs once per command (CI/CD)"
                              : "Runs continuously, polling for commands"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}

        {/* Step 2: Tool Selection - Isolated component */}
        {step === 2 && (
          <div>
            <ToolSelection
              tools={toolSelectionOptions}
              selectedTools={selectedTools}
              onSelectionChange={setSelectedTools}
              isLoading={isLoadingOptions}
              error={optionsError}
            />
          </div>
        )}

        <DialogFooter className="gap-3">
          {step === 1 ? (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" onClick={handleNextStep} disabled={!canProceedToStep2}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isMutating}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button onClick={form.handleSubmit(onSubmit)} disabled={isMutating}>
                {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Agent
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
