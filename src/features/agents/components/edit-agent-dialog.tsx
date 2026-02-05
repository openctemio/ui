"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Settings } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { ToolSelection, type ToolOption } from "./tool-selection";
import {
  updateAgentSchema,
  type UpdateAgentFormData,
  AGENT_STATUS_OPTIONS,
  AGENT_EXECUTION_MODE_OPTIONS,
} from "../schemas/agent-schema";
import { useAgentFormOptions } from "../hooks";
import { useUpdateAgent, invalidateAgentsCache } from "@/lib/api/agent-hooks";
import type { Agent } from "@/lib/api/agent-types";

interface EditAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent;
  onSuccess?: () => void;
}

export function EditAgentDialog({
  open,
  onOpenChange,
  agent,
  onSuccess,
}: EditAgentDialogProps) {
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  const {
    toolOptions,
    isLoading: isLoadingOptions,
    error: optionsError,
    getCapabilitiesForTools,
  } = useAgentFormOptions();

  const { trigger: updateAgent, isMutating } = useUpdateAgent(agent.id);

  const form = useForm<UpdateAgentFormData>({
    resolver: zodResolver(updateAgentSchema),
    defaultValues: {
      name: agent.name,
      description: agent.description || "",
      capabilities: agent.capabilities || [],
      tools: agent.tools || [],
      execution_mode: agent.execution_mode,
      status: agent.status,
    },
  });

  // Convert toolOptions to the format expected by ToolSelection
  const toolSelectionOptions: ToolOption[] = toolOptions.map((t) => ({
    value: t.value,
    label: t.label,
    description: t.description,
    category: t.category,
  }));

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedTools(agent.tools || []);
      form.reset({
        name: agent.name,
        description: agent.description || "",
        capabilities: agent.capabilities || [],
        tools: agent.tools || [],
        execution_mode: agent.execution_mode,
        status: agent.status,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agent.id]);

  const onSubmit = async (data: UpdateAgentFormData) => {
    try {
      const capabilities = getCapabilitiesForTools(selectedTools);

      await updateAgent({
        name: data.name,
        description: data.description,
        capabilities: capabilities as never[],
        tools: selectedTools as never[],
        execution_mode: data.execution_mode,
        status: data.status,
      });

      toast.success(`Agent "${data.name || agent.name}" updated successfully`);
      await invalidateAgentsCache();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update agent"
      );
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedTools([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Agent
          </DialogTitle>
          <DialogDescription>
            Update configuration for <strong>{agent.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="settings">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="tools">
              Tools
              {selectedTools.length > 0 && (
                <span className="ml-1.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-xs">
                  {selectedTools.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-4">
            <Form {...form}>
              <form className="space-y-4">
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {AGENT_STATUS_OPTIONS.filter((opt) =>
                          ["active", "inactive", "pending"].includes(opt.value)
                        ).map((option) => (
                          <div
                            key={option.value}
                            onClick={() => field.onChange(option.value)}
                            className={cn(
                              "flex items-center justify-center rounded-lg border-2 p-2.5 cursor-pointer transition-colors text-sm",
                              field.value === option.value
                                ? "border-primary bg-primary/5 font-medium"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            {option.label}
                          </div>
                        ))}
                      </div>
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
          </TabsContent>

          {/* Tools Tab - Isolated component */}
          <TabsContent value="tools" className="mt-4">
            <ToolSelection
              tools={toolSelectionOptions}
              selectedTools={selectedTools}
              onSelectionChange={setSelectedTools}
              isLoading={isLoadingOptions}
              error={optionsError}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-3">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isMutating}>
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isMutating}>
            {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
