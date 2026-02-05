'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Plus, X, ChevronDown, ChevronRight, Terminal, Tag } from 'lucide-react';
import type { Tool } from '@/lib/api/tool-types';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import {
  useCreateCustomTool,
  useUpdateCustomTool,
  invalidateCustomToolsCache,
} from '@/lib/api/tool-hooks';
import {
  useAllToolCategories,
  getCategoryNameById,
} from '@/lib/api/tool-category-hooks';
import {
  createToolSchema,
  type CreateToolFormData,
  CATEGORY_OPTIONS,
  INSTALL_METHOD_OPTIONS,
} from '../schemas/tool-schema';
import { ToolCategoryIcon } from './tool-category-icon';

interface AddToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** Tool to edit - if provided, dialog is in edit mode */
  tool?: Tool | null;
}

export function AddToolDialog({
  open,
  onOpenChange,
  onSuccess,
  tool,
}: AddToolDialogProps) {
  const [tagInput, setTagInput] = useState('');
  const [capabilityInput, setCapabilityInput] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [formatInput, setFormatInput] = useState('');
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);

  const isEditMode = !!tool;

  const { trigger: createTool, isMutating: isCreating } = useCreateCustomTool();
  const { trigger: updateTool, isMutating: isUpdating } = useUpdateCustomTool(tool?.id || '');
  const { data: categoriesData } = useAllToolCategories();

  const isMutating = isCreating || isUpdating;

  const form = useForm<CreateToolFormData>({
    resolver: zodResolver(createToolSchema),
    defaultValues: {
      name: '',
      display_name: '',
      description: '',
      category: undefined,
      install_method: undefined,
      install_cmd: '',
      update_cmd: '',
      version_cmd: '',
      version_regex: '',
      docs_url: '',
      github_url: '',
      logo_url: '',
      capabilities: [],
      supported_targets: [],
      output_formats: [],
      tags: [],
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (tool && open) {
      // Look up category name from category_id
      const categoryName = getCategoryNameById(categoriesData?.items, tool.category_id);
      form.reset({
        name: tool.name,
        display_name: tool.display_name,
        description: tool.description || '',
        category: categoryName as typeof CATEGORY_OPTIONS[number]['value'] | undefined,
        install_method: tool.install_method,
        install_cmd: tool.install_cmd || '',
        update_cmd: tool.update_cmd || '',
        version_cmd: tool.version_cmd || '',
        version_regex: tool.version_regex || '',
        docs_url: tool.docs_url || '',
        github_url: tool.github_url || '',
        logo_url: tool.logo_url || '',
        capabilities: tool.capabilities || [],
        supported_targets: tool.supported_targets || [],
        output_formats: tool.output_formats || [],
        tags: tool.tags || [],
      });
      // Expand sections if they have data
      if (tool.install_cmd || tool.update_cmd || tool.version_cmd) {
        setCommandsOpen(true);
      }
      if (
        (tool.capabilities?.length ?? 0) > 0 ||
        (tool.supported_targets?.length ?? 0) > 0 ||
        (tool.output_formats?.length ?? 0) > 0 ||
        (tool.tags?.length ?? 0) > 0 ||
        tool.docs_url ||
        tool.github_url ||
        tool.logo_url
      ) {
        setMetadataOpen(true);
      }
    }
  }, [tool, open, form, categoriesData]);

  const handleSubmit = async (data: CreateToolFormData) => {
    try {
      const payload = {
        name: data.name,
        display_name: data.display_name || data.name,
        description: data.description || undefined,
        category: data.category,
        install_method: data.install_method,
        install_cmd: data.install_cmd || undefined,
        update_cmd: data.update_cmd || undefined,
        version_cmd: data.version_cmd || undefined,
        version_regex: data.version_regex || undefined,
        docs_url: data.docs_url || undefined,
        github_url: data.github_url || undefined,
        logo_url: data.logo_url || undefined,
        capabilities: data.capabilities,
        supported_targets: data.supported_targets,
        output_formats: data.output_formats,
        tags: data.tags,
      };

      if (isEditMode) {
        await updateTool(payload);
        toast.success(`Tool "${data.display_name || data.name}" updated`);
      } else {
        await createTool(payload);
        toast.success(`Tool "${data.display_name || data.name}" created`);
      }

      await invalidateCustomToolsCache();
      form.reset();
      setCommandsOpen(false);
      setMetadataOpen(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'create'} tool`
      );
    }
  };

  const addArrayItem = (
    fieldName: 'tags' | 'capabilities' | 'supported_targets' | 'output_formats',
    value: string,
    setter: (v: string) => void
  ) => {
    const currentValue = form.getValues(fieldName) || [];
    if (value.trim() && !currentValue.includes(value.trim())) {
      form.setValue(fieldName, [...currentValue, value.trim()]);
    }
    setter('');
  };

  const removeArrayItem = (
    fieldName: 'tags' | 'capabilities' | 'supported_targets' | 'output_formats',
    item: string
  ) => {
    const currentValue = form.getValues(fieldName) || [];
    form.setValue(
      fieldName,
      currentValue.filter((v) => v !== item)
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setCommandsOpen(false);
      setMetadataOpen(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Tool' : 'Add Custom Tool'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the tool configuration.'
              : 'Register a new security tool for your team.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 space-y-5">
              {/* Required Fields Section */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="semgrep"
                            className="font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Semgrep" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <ToolCategoryIcon
                                    category={option.value}
                                    className="h-4 w-4"
                                  />
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
                    name="install_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Install Method *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INSTALL_METHOD_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Brief description of what this tool does..."
                          rows={2}
                          className="resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="github_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GitHub URL</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="url"
                            placeholder="https://github.com/..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="docs_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Docs URL</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="url"
                            placeholder="https://docs.example.com"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Commands Section - Collapsible */}
              <Collapsible open={commandsOpen} onOpenChange={setCommandsOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className="w-full justify-between px-3 py-2 h-auto font-medium text-sm hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-muted-foreground" />
                      <span>Commands</span>
                      <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                    </div>
                    {commandsOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <FormField
                    control={form.control}
                    name="install_cmd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Install Command</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="go install github.com/example/tool@latest"
                            className="font-mono text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="update_cmd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Update Command</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="go install github.com/example/tool@latest"
                            className="font-mono text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="version_cmd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Version Command</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="tool --version"
                              className="font-mono text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="version_regex"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Version Regex</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="v?(\d+\.\d+\.\d+)"
                              className="font-mono text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Metadata Section - Collapsible */}
              <Collapsible open={metadataOpen} onOpenChange={setMetadataOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className="w-full justify-between px-3 py-2 h-auto font-medium text-sm hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span>Metadata</span>
                      <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                    </div>
                    {metadataOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3">
                  {/* Tags */}
                  <div>
                    <FormLabel className="text-sm">Tags</FormLabel>
                    <div className="mt-1.5 flex gap-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Add tag..."
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addArrayItem('tags', tagInput, setTagInput);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => addArrayItem('tags', tagInput, setTagInput)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {(form.watch('tags')?.length ?? 0) > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {form.watch('tags')?.map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeArrayItem('tags', tag)}
                              className="hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Capabilities */}
                  <div>
                    <FormLabel className="text-sm">Capabilities</FormLabel>
                    <div className="mt-1.5 flex gap-2">
                      <Input
                        value={capabilityInput}
                        onChange={(e) => setCapabilityInput(e.target.value)}
                        placeholder="Add capability..."
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addArrayItem('capabilities', capabilityInput, setCapabilityInput);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          addArrayItem('capabilities', capabilityInput, setCapabilityInput)
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {(form.watch('capabilities')?.length ?? 0) > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {form.watch('capabilities')?.map((cap) => (
                          <Badge key={cap} variant="outline" className="gap-1 text-xs">
                            {cap}
                            <button
                              type="button"
                              onClick={() => removeArrayItem('capabilities', cap)}
                              className="hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Supported Targets */}
                  <div>
                    <FormLabel className="text-sm">Supported Targets</FormLabel>
                    <div className="mt-1.5 flex gap-2">
                      <Input
                        value={targetInput}
                        onChange={(e) => setTargetInput(e.target.value)}
                        placeholder="e.g., python, javascript"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addArrayItem('supported_targets', targetInput, setTargetInput);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          addArrayItem('supported_targets', targetInput, setTargetInput)
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {(form.watch('supported_targets')?.length ?? 0) > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {form.watch('supported_targets')?.map((target) => (
                          <Badge key={target} variant="outline" className="gap-1 text-xs">
                            {target}
                            <button
                              type="button"
                              onClick={() => removeArrayItem('supported_targets', target)}
                              className="hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Output Formats */}
                  <div>
                    <FormLabel className="text-sm">Output Formats</FormLabel>
                    <div className="mt-1.5 flex gap-2">
                      <Input
                        value={formatInput}
                        onChange={(e) => setFormatInput(e.target.value)}
                        placeholder="e.g., json, sarif"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addArrayItem('output_formats', formatInput, setFormatInput);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          addArrayItem('output_formats', formatInput, setFormatInput)
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {(form.watch('output_formats')?.length ?? 0) > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {form.watch('output_formats')?.map((format) => (
                          <Badge key={format} variant="outline" className="gap-1 text-xs">
                            {format}
                            <button
                              type="button"
                              onClick={() => removeArrayItem('output_formats', format)}
                              className="hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Logo URL */}
                  <FormField
                    control={form.control}
                    name="logo_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="url"
                            placeholder="https://example.com/logo.png"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>

            <DialogFooter className="pt-4 border-t mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isMutating}>
                {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Update Tool' : 'Create Tool'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
