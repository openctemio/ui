'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { copyToClipboard } from '@/lib/clipboard'
import { cn } from '@/lib/utils'
import type { VerifiedDomainInstructions } from '../types/verified-domain.types'

/** A single labelled, copyable value (host / type / value). */
function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <code
          className="bg-muted flex-1 truncate rounded px-2 py-1 font-mono text-xs"
          title={value}
        >
          {value}
        </code>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={`Copy ${label}`}
          onClick={async () => {
            await copyToClipboard(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  )
}

/**
 * DNS TXT verification record + a short explainer. Shown after adding a
 * domain and re-exposed on each pending/failed row so the admin can re-copy.
 */
export function DnsInstructions({
  instructions,
  className,
}: {
  instructions: VerifiedDomainInstructions
  className?: string
}) {
  return (
    <div className={cn('space-y-3 rounded-md border bg-muted/30 p-3', className)}>
      <p className="text-muted-foreground text-xs">
        1) Add this TXT record at your DNS provider. 2) Click{' '}
        <span className="font-medium">Verify now</span>. DNS changes can take a while to propagate —
        re-check if it is not picked up yet.
      </p>
      <CopyField label="Host / Name" value={instructions.host} />
      <CopyField label="Type" value={instructions.type} />
      <CopyField label="Value" value={instructions.value} />
    </div>
  )
}
