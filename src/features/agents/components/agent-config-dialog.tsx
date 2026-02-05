"use client";

import { useState } from "react";
import { Copy, Check, FileCode, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { Agent } from "@/lib/api/agent-types";

interface AgentConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent;
  apiKey?: string; // Optional - only available right after creation/regeneration
}

export function AgentConfigDialog({
  open,
  onOpenChange,
  agent,
  apiKey,
}: AgentConfigDialogProps) {
  const [copied, setCopied] = useState<string | null>(null);

  // Get the public API URL for external agent connections
  // Priority: NEXT_PUBLIC_API_BASE_URL > derive from NEXT_PUBLIC_APP_URL > fallback
  const baseUrl = (() => {
    // Use explicit API base URL if set
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
      return process.env.NEXT_PUBLIC_API_BASE_URL;
    }

    // Derive from app URL by replacing 'app.' with 'api.' or prepending 'api.'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

    try {
      const url = new URL(appUrl);
      // If hostname starts with 'app.', replace with 'api.'
      if (url.hostname.startsWith("app.")) {
        url.hostname = url.hostname.replace(/^app\./, "api.");
      } else if (!url.hostname.startsWith("api.") && url.hostname !== "localhost") {
        // For other domains, prepend 'api.'
        url.hostname = `api.${url.hostname}`;
      } else if (url.hostname === "localhost") {
        // For localhost, use api.localhost or add port 8080
        if (url.port) {
          url.port = "8080";
        } else {
          url.hostname = "api.localhost";
        }
      }
      return url.origin;
    } catch {
      return "http://localhost:8080";
    }
  })();

  // Generate scanner configs based on agent's tools
  const scannerConfigs = agent.tools.length > 0
    ? agent.tools.map(tool => {
        // Map tool names to scanner names
        const scannerName = tool === "trivy" ? "trivy-fs" : tool;
        return `  - name: ${scannerName}\n    enabled: true`;
      }).join("\n")
    : `  - name: semgrep\n    enabled: true`;

  // YAML config template
  const yamlConfig = `# Agent Configuration for ${agent.name}
# Generated from UI

agent:
  name: ${agent.name}
  region: "${agent.region || ""}"  # Optional: deployment region for monitoring
  enable_commands: true
  command_poll_interval: 30s
  heartbeat_interval: 1m

server:
  base_url: ${baseUrl}
  api_key: ${apiKey || "<YOUR_API_KEY>"}
  agent_id: ${agent.id}

scanners:
${scannerConfigs}

# Optional: Default scan targets (for standalone mode)
# targets:
#   - /path/to/project1
#   - /path/to/project2
`;

  // Environment variables
  const envConfig = `# Environment Variables for ${agent.name}

export API_URL=${baseUrl}
export API_KEY=${apiKey || "<YOUR_API_KEY>"}
export AGENT_ID=${agent.id}
${agent.region ? `export REGION=${agent.region}` : "# export REGION=ap-southeast-1  # Optional: deployment region"}
`;

  // Docker run command
  const dockerConfig = `# Docker run command for ${agent.name}

docker run -d \\
  --name ${agent.name.toLowerCase().replace(/\s+/g, "-")} \\
  -v /path/to/scan:/code:ro \\
  -e API_URL=${baseUrl} \\
  -e API_KEY=${apiKey || "<YOUR_API_KEY>"} \\
  -e AGENT_ID=${agent.id} \\
  ${agent.region ? `-e REGION=${agent.region} \\` : "# -e REGION=ap-southeast-1 \\  # Optional"}
  rediverio/agent:latest \\
  -daemon -config /app/agent.yaml
`;

  // CLI one-shot command
  const cliConfig = `# CLI Commands for ${agent.name}

# One-shot scan (run once and exit)
./agent \\
  -tool ${agent.tools[0] === "trivy" ? "trivy-fs" : agent.tools[0] || "semgrep"} \\
  -target /path/to/project \\
  -push

# Daemon mode (continuous)
./agent -daemon -config agent.yaml

# With environment variables
export API_URL=${baseUrl}
export API_KEY=${apiKey || "<YOUR_API_KEY>"}
./agent -tool ${agent.tools[0] === "trivy" ? "trivy-fs" : agent.tools[0] || "semgrep"} -target . -push
`;

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Agent Configuration
          </DialogTitle>
          <DialogDescription>
            Configuration templates for <strong>{agent.name}</strong>
            {!apiKey && (
              <span className="text-yellow-600 dark:text-yellow-400 block mt-1">
                Note: Replace {"<YOUR_API_KEY>"} with your actual API key
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="yaml" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="yaml">YAML</TabsTrigger>
            <TabsTrigger value="env">Env Vars</TabsTrigger>
            <TabsTrigger value="docker">Docker</TabsTrigger>
            <TabsTrigger value="cli">CLI</TabsTrigger>
          </TabsList>

          <TabsContent value="yaml" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="flex justify-end gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(yamlConfig, `${agent.name.toLowerCase().replace(/\s+/g, "-")}-agent.yaml`)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(yamlConfig, "YAML config")}
              >
                {copied === "YAML config" ? (
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Copy
              </Button>
            </div>
            <pre className="flex-1 overflow-auto rounded-lg bg-muted p-4 text-sm font-mono whitespace-pre">
              {yamlConfig}
            </pre>
          </TabsContent>

          <TabsContent value="env" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="flex justify-end gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(envConfig, "Environment variables")}
              >
                {copied === "Environment variables" ? (
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Copy
              </Button>
            </div>
            <pre className="flex-1 overflow-auto rounded-lg bg-muted p-4 text-sm font-mono whitespace-pre">
              {envConfig}
            </pre>
          </TabsContent>

          <TabsContent value="docker" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="flex justify-end gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(dockerConfig, "Docker command")}
              >
                {copied === "Docker command" ? (
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Copy
              </Button>
            </div>
            <pre className="flex-1 overflow-auto rounded-lg bg-muted p-4 text-sm font-mono whitespace-pre">
              {dockerConfig}
            </pre>
          </TabsContent>

          <TabsContent value="cli" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="flex justify-end gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(cliConfig, "CLI commands")}
              >
                {copied === "CLI commands" ? (
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Copy
              </Button>
            </div>
            <pre className="flex-1 overflow-auto rounded-lg bg-muted p-4 text-sm font-mono whitespace-pre">
              {cliConfig}
            </pre>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
