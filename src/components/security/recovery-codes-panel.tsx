'use client'

import { useState } from 'react'
import { Check, Copy, Download } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

interface RecoveryCodesPanelProps {
  codes: string[]
  /** Used in the downloaded file name and header, e.g. the account email. */
  accountLabel?: string
}

/**
 * Shows freshly issued two-factor recovery codes once, with copy and download.
 * The server keeps only hashes, so this is the only time they can be read.
 */
export function RecoveryCodesPanel({ codes, accountLabel }: RecoveryCodesPanelProps) {
  const [copied, setCopied] = useState(false)

  const text = [
    `OpenCTEM two-factor recovery codes${accountLabel ? ` for ${accountLabel}` : ''}`,
    `Generated ${new Date().toISOString()}`,
    'Each code works once. Keep them somewhere safe.',
    '',
    ...codes,
    '',
  ].join('\n')

  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopied(true)
      toast.success('Recovery codes copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy. Select the codes and copy them manually.')
    }
  }

  function download() {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'openctem-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <ul
        aria-label="Recovery codes"
        className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-md border bg-muted/40 p-4"
      >
        {codes.map((c) => (
          <li key={c} className="font-mono text-sm tabular-nums">
            {c}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Copy
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={download}>
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Each code signs you in once if you lose your authenticator. They will not be shown again.
      </p>
    </div>
  )
}
