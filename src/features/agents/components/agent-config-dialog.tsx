'use client'

import { useEffect, useState } from 'react'
import { Copy, Check, FileCode, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { Agent } from '@/lib/api/agent-types'

interface RenderedTemplates {
  yaml: string
  env: string
  docker: string
  cli: string
}

interface AgentConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent: Agent
  apiKey?: string // Optional - only available right after creation/regeneration
}

export function AgentConfigDialog({ open, onOpenChange, agent, apiKey }: AgentConfigDialogProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [templates, setTemplates] = useState<RenderedTemplates | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Fetch rendered templates from the backend.
  // Templates live in api/configs/agent-templates/*.tmpl on the API host —
  // operators can edit them without rebuilding the frontend.
  //
  // SECURITY: API key (when provided) is sent via X-Agent-API-Key header,
  // never as a query parameter — query strings get logged by proxies,
  // load balancers, browser history, and referer headers.
  useEffect(() => {
    if (!open || !agent.id) return

    const controller = new AbortController()
    setLoading(true)
    setFetchError(null)

    const headers: Record<string, string> = { Accept: 'application/json' }
    if (apiKey) {
      headers['X-Agent-API-Key'] = apiKey
    }

    fetch(`/api/v1/agents/${agent.id}/config-templates`, {
      credentials: 'include',
      headers,
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.text()
          throw new Error(`HTTP ${res.status}: ${body || res.statusText}`)
        }
        return res.json() as Promise<RenderedTemplates>
      })
      .then((data) => setTemplates(data))
      .catch((err: Error) => {
        if (err.name === 'AbortError') return
        setFetchError(err.message)
        toast.error(`Failed to load agent config templates: ${err.message}`)
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [open, agent.id, apiKey])

  const yamlConfig = templates?.yaml ?? ''
  const envConfig = templates?.env ?? ''
  const dockerConfig = templates?.docker ?? ''
  const cliConfig = templates?.cli ?? ''

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    toast.success(`${label} copied to clipboard`)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Downloaded ${filename}`)
  }

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
                Note: Replace {'<YOUR_API_KEY>'} with your actual API key
              </span>
            )}
            <span className="text-muted-foreground block mt-1 text-xs">
              Templates are loaded from <code>configs/agent-templates/*.tmpl</code> on the API host
              — edit them there to customize without rebuilding the UI.
            </span>
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading templates...</span>
          </div>
        )}

        {fetchError && !loading && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <strong>Failed to load templates:</strong> {fetchError}
          </div>
        )}

        {!loading && !fetchError && (
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
                  disabled={!yamlConfig}
                  aria-label="Download agent YAML configuration"
                  onClick={() =>
                    handleDownload(
                      yamlConfig,
                      `${agent.name.toLowerCase().replace(/\s+/g, '-')}-agent.yaml`
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!yamlConfig}
                  aria-label="Copy YAML config to clipboard"
                  onClick={() => handleCopy(yamlConfig, 'YAML config')}
                >
                  {copied === 'YAML config' ? (
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
                  disabled={!envConfig}
                  aria-label="Copy environment variables to clipboard"
                  onClick={() => handleCopy(envConfig, 'Environment variables')}
                >
                  {copied === 'Environment variables' ? (
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
                  disabled={!dockerConfig}
                  aria-label="Copy Docker command to clipboard"
                  onClick={() => handleCopy(dockerConfig, 'Docker command')}
                >
                  {copied === 'Docker command' ? (
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
                  disabled={!cliConfig}
                  aria-label="Copy CLI commands to clipboard"
                  onClick={() => handleCopy(cliConfig, 'CLI commands')}
                >
                  {copied === 'CLI commands' ? (
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
        )}
      </DialogContent>
    </Dialog>
  )
}
