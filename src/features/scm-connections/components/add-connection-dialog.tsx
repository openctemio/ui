"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Link2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { ProviderIcon } from "./provider-icon";
import {
  createSCMConnectionSchema,
  type CreateSCMConnectionFormData,
  SCM_PROVIDER_OPTIONS,
  DEFAULT_BASE_URLS,
} from "../schemas/scm-connection.schema";
import {
  useCreateIntegrationApi,
  invalidateSCMIntegrationsCache,
} from "@/features/integrations";

interface AddConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type TestStatus = "idle" | "testing" | "success" | "error";

interface TestResult {
  repositoryCount: number;
  organization?: string;
  username?: string;
}

export function AddConnectionDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddConnectionDialogProps) {
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testError, setTestError] = useState<string>("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showToken, setShowToken] = useState(false);

  const form = useForm<CreateSCMConnectionFormData>({
    resolver: zodResolver(createSCMConnectionSchema),
    defaultValues: {
      name: "",
      provider: "github",
      authType: "token",
      baseUrl: DEFAULT_BASE_URLS.github,
      accessToken: "",
      scmOrganization: "",
    },
  });

  const { trigger: createConnection, isMutating } = useCreateIntegrationApi();

  const selectedProvider = form.watch("provider");

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setTestStatus("idle");
      setTestError("");
      setTestResult(null);
      setShowToken(false);
    }
  }, [open]);

  // Update base URL when provider changes
  const handleProviderChange = (provider: string) => {
    form.setValue("provider", provider as CreateSCMConnectionFormData["provider"]);
    form.setValue("baseUrl", DEFAULT_BASE_URLS[provider] || "");
    // Reset test status when provider changes
    setTestStatus("idle");
    setTestError("");
    setTestResult(null);
  };

  // Test connection without creating
  const handleTestConnection = async () => {
    const values = form.getValues();

    // Validate required fields for test
    const isValid = await form.trigger(["accessToken"]);
    if (!isValid) {
      return;
    }

    setTestStatus("testing");
    setTestError("");
    setTestResult(null);

    try {
      const response = await fetch("/api/v1/integrations/test-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category: "scm",
          provider: values.provider,
          base_url: values.baseUrl || DEFAULT_BASE_URLS[values.provider],
          auth_type: values.authType,
          credentials: values.accessToken,
          scm_organization: values.scmOrganization || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Test failed");
      }

      if (data.success) {
        setTestStatus("success");
        setTestResult({
          repositoryCount: data.repository_count || 0,
          organization: data.organization,
          username: data.username,
        });
      } else {
        setTestStatus("error");
        setTestError(data.message || "Connection test failed");
      }
    } catch (error) {
      setTestStatus("error");
      setTestError(error instanceof Error ? error.message : "Failed to test connection");
    }
  };

  // Create connection (without testing first)
  const onSubmit = async (data: CreateSCMConnectionFormData) => {
    try {
      await createConnection({
        name: data.name,
        category: "scm",
        provider: data.provider,
        auth_type: data.authType,
        base_url: data.baseUrl || DEFAULT_BASE_URLS[data.provider],
        credentials: data.accessToken,
        scm_organization: data.scmOrganization,
      });

      toast.success(`Connection "${data.name}" created successfully`);
      await invalidateSCMIntegrationsCache();
      form.reset();
      setTestStatus("idle");
      setTestError("");
      setTestResult(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create connection"
      );
    }
  };

  const handleClose = () => {
    form.reset();
    setTestStatus("idle");
    setTestError("");
    setTestResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Add SCM Connection
          </DialogTitle>
          <DialogDescription>
            Connect your source code management platform to import repositories
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Provider Selection */}
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <Select
                    onValueChange={handleProviderChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SCM_PROVIDER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <ProviderIcon
                              provider={option.value}
                              className="h-4 w-4"
                            />
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {SCM_PROVIDER_OPTIONS.find((o) => o.value === selectedProvider)?.description}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Connection Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., My GitHub Enterprise"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A friendly name to identify this connection
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Base URL (optional for cloud services) */}
            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={DEFAULT_BASE_URLS[selectedProvider]}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave default for cloud services, or enter your self-hosted URL
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Organization (optional) */}
            <FormField
              control={form.control}
              name="scmOrganization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization / Group (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., my-org"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Limit repositories to a specific organization or group
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Access Token */}
            <FormField
              control={form.control}
              name="accessToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Access Token</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showToken ? "text" : "password"}
                        placeholder="Enter your access token"
                        className="pr-10"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Reset test status when token changes
                          if (testStatus !== "idle") {
                            setTestStatus("idle");
                            setTestError("");
                            setTestResult(null);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Token requires read access to repositories
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Test Connection Status */}
            {testStatus !== "idle" && (
              <div
                className={cn(
                  "rounded-lg border p-3",
                  testStatus === "success" && "border-green-500/50 bg-green-500/10",
                  testStatus === "error" && "border-red-500/50 bg-red-500/10",
                  testStatus === "testing" && "border-blue-500/50 bg-blue-500/10"
                )}
              >
                <div className="flex items-center gap-2">
                  {testStatus === "testing" && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-sm text-blue-500">Testing connection...</span>
                    </>
                  )}
                  {testStatus === "success" && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-500">Connection successful!</span>
                      </div>
                      {testResult && (
                        <div className="text-xs text-muted-foreground ml-6">
                          {testResult.username && <span>User: {testResult.username}</span>}
                          {testResult.organization && <span> | Org: {testResult.organization}</span>}
                          <span> | {testResult.repositoryCount} repositories found</span>
                        </div>
                      )}
                    </div>
                  )}
                  {testStatus === "error" && (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-500">{testError || "Connection failed"}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testStatus === "testing" || isMutating}
              >
                {testStatus === "testing" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Test Connection
              </Button>
              <Button type="submit" disabled={isMutating || testStatus === "testing"}>
                {isMutating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Add Connection
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
