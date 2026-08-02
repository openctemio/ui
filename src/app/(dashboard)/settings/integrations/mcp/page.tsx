'use client'

import { useEffect, useMemo, useState } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Bot,
  Plug,
  ShieldCheck,
  Copy,
  Check,
  Loader2,
  KeyRound,
  AlertTriangle,
  FileText,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/clipboard'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useCreateApiKey } from '@/features/api-keys/api/use-api-keys'
import type { CreateAPIKeyResponse } from '@/features/api-keys/types/api-key.types'
import { Can, Permission } from '@/lib/permissions'

// A minted MCP key carries exactly the read scopes below — nothing more. The
// user picks the key's purpose so it maps to what the server's MCP tools/prompts
// require. Scope strings mirror the backend permission constants (see
// src/lib/permissions/constants.ts).
type PresetId = 'general' | 'pentest'

const KEY_PRESETS: Record<
  PresetId,
  {
    label: string
    hint: string
    scopes: string[]
    defaultName: string
    description: string
  }
> = {
  general: {
    label: 'General read access',
    hint: 'findings / assets / compliance',
    // Read-only CTEM data: findings, KEV/EPSS CVEs, attack paths, compliance, assets.
    scopes: ['findings:read', 'assets:read', 'compliance:frameworks:read'],
    defaultName: 'Claude MCP',
    description: 'MCP connection key (read-only AI access)',
  },
  pentest: {
    label: 'Pentest report writing',
    hint: 'campaigns / findings / retests / templates',
    // Read-only pentest data used by the report-writing tools + prompts.
    scopes: [
      'pentest:campaigns:read',
      'pentest:findings:read',
      'pentest:retests:read',
      'pentest:templates:read',
    ],
    defaultName: 'Pentest report writer',
    description: 'MCP connection key for pentest report writing (read-only AI access)',
  },
}

const EXPIRY_OPTIONS = [
  { label: 'Never', value: '0' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
  { label: '1 year', value: '365' },
]

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        if (await copyToClipboard(value)) {
          setCopied(true)
          toast.success(`${label} copied`)
          setTimeout(() => setCopied(false), 1500)
        }
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span className="ml-1.5">Copy</span>
    </Button>
  )
}

export default function MCPConnectPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [preset, setPreset] = useState<PresetId>('general')
  const [name, setName] = useState(KEY_PRESETS.general.defaultName)
  const [expiry, setExpiry] = useState('90')
  const [created, setCreated] = useState<CreateAPIKeyResponse | null>(null)
  const { trigger, isMutating } = useCreateApiKey()

  const activePreset = KEY_PRESETS[preset]

  // Switching purpose swaps the default key name unless the user has typed a
  // custom one that doesn't match either preset's default.
  const handlePresetChange = (next: PresetId) => {
    const isDefaultName = Object.values(KEY_PRESETS).some((p) => p.defaultName === name.trim())
    if (isDefaultName || !name.trim()) {
      setName(KEY_PRESETS[next].defaultName)
    }
    setPreset(next)
  }

  // The MCP endpoint is served under the API path; default to this origin (the
  // Next proxy forwards /api/v1/* to the backend). Adjust if your API is hosted
  // on a different domain.
  const [endpoint, setEndpoint] = useState('/api/v1/mcp')
  useEffect(() => {
    setEndpoint(`${window.location.origin}/api/v1/mcp`)
  }, [])

  const configJson = useMemo(() => {
    const key = created?.key ?? 'oct_YOUR_KEY_HERE'
    return JSON.stringify(
      {
        mcpServers: {
          openctem: {
            type: 'http',
            url: endpoint,
            headers: { Authorization: `Bearer ${key}` },
          },
        },
      },
      null,
      2
    )
  }, [created, endpoint])

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Give the key a name')
      return
    }
    try {
      const res = await trigger({
        name: trimmed,
        description: activePreset.description,
        scopes: activePreset.scopes,
        expires_in_days: expiry === '0' ? undefined : Number(expiry),
      })
      setCreated(res ?? null)
      setDialogOpen(false)
      toast.success('MCP key generated — copy it now, it is shown only once')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to generate the MCP key'))
    }
  }

  return (
    <Main>
      <PageHeader
        title="AI Access (MCP)"
        description="Connect Claude (Desktop, Code, or any MCP client) to this tenant's CTEM data — read-only."
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" /> What is MCP?
            </CardTitle>
            <CardDescription>
              The Model Context Protocol lets an AI assistant query your data through defined tools.
              This server exposes <strong>read-only</strong> access to findings,
              KEV/EPSS-prioritized CVEs, attack-path exposure chains, remediation groups, compliance
              posture, and assets — plus a <strong>pentest report-writing</strong> toolset
              (campaigns, findings, retests, templates) with drafting prompts.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Read-only
            </Badge>
            <span className="text-muted-foreground text-xs">{activePreset.label} scopes:</span>
            {activePreset.scopes.map((s) => (
              <Badge key={s} variant="outline" className="font-mono text-xs">
                {s}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" /> Connect a client
            </CardTitle>
            <CardDescription>
              Pick the key&apos;s purpose, generate a connection key, then add this configuration to
              your MCP client. The key is scoped to exactly the read permissions above and is bound
              to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Can
              permission={Permission.ApiKeysWrite}
              fallback={
                <p className="text-muted-foreground text-sm">
                  You need the API-keys permission to generate a connection key.
                </p>
              }
            >
              <Button onClick={() => setDialogOpen(true)}>
                <KeyRound className="h-4 w-4" />
                <span className="ml-1.5">Generate connection key</span>
              </Button>
            </Can>

            {created ? (
              <div className="border-primary/40 bg-primary/5 space-y-3 rounded-md border p-4">
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p>
                    Copy your key now — for security it is shown <strong>only once</strong>. It is
                    already embedded in the configuration below.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input readOnly value={created.key} className="font-mono text-xs" />
                  <CopyButton value={created.key} label="Key" />
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Client configuration</Label>
                <CopyButton value={configJson} label="Configuration" />
              </div>
              <pre className="bg-muted overflow-x-auto rounded-md p-4 text-xs">
                <code>{configJson}</code>
              </pre>
              <p className="text-muted-foreground text-xs">
                Endpoint: <code className="font-mono">{endpoint}</code>. If your OpenCTEM API is on
                a different host, replace the URL accordingly.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Write pentest reports with MCP
            </CardTitle>
            <CardDescription>
              Connect a <strong>Pentest report writing</strong> key, then draft report sections
              inside your MCP client (Claude Desktop, Code, or Cursor) and paste them back into the
              finding or campaign editor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <strong>Pull context.</strong> Call the read tools —{' '}
                <code className="font-mono text-xs">get_campaign</code>,{' '}
                <code className="font-mono text-xs">list_campaign_findings</code>,{' '}
                <code className="font-mono text-xs">list_retests</code>,{' '}
                <code className="font-mono text-xs">list_finding_templates</code>, and{' '}
                <code className="font-mono text-xs">campaign_report_stats</code> — to load the
                campaign, its findings, retest history, and reusable templates.
              </li>
              <li>
                <strong>Draft with prompts.</strong> Use the MCP prompts{' '}
                <code className="font-mono text-xs">exec_summary</code>,{' '}
                <code className="font-mono text-xs">finding_writeup</code>,{' '}
                <code className="font-mono text-xs">remediation_guidance</code>, and{' '}
                <code className="font-mono text-xs">attack_narrative</code> to generate each report
                section from that context.
              </li>
              <li>
                <strong>Paste back.</strong> Review the draft, then paste it into the finding or
                campaign editor and refine. Nothing is written by the AI — the key is read-only.
              </li>
            </ol>
            <div className="border-primary/40 bg-primary/5 flex items-start gap-2 rounded-md border p-3">
              <Sparkles className="text-primary mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-muted-foreground">
                Evidence blobs are <strong>never</strong> exposed to the AI — the tools return only
                counts, so raw proof and attachments stay inside OpenCTEM.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate MCP connection key</DialogTitle>
            <DialogDescription>
              Read-only and bound to your account — it stops working if your membership is suspended
              or removed. Pick the purpose to scope the key.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mcp-key-purpose">Purpose</Label>
              <Select value={preset} onValueChange={(v) => handlePresetChange(v as PresetId)}>
                <SelectTrigger id="mcp-key-purpose">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(KEY_PRESETS) as PresetId[]).map((id) => (
                    <SelectItem key={id} value={id}>
                      {KEY_PRESETS[id].label} ({KEY_PRESETS[id].hint})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activePreset.scopes.map((s) => (
                  <Badge key={s} variant="outline" className="font-mono text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-key-name">Name</Label>
              <Input
                id="mcp-key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Claude on my laptop"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-key-expiry">Expires</Label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger id="mcp-key-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isMutating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isMutating}>
              {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Main>
  )
}
