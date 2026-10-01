'use client'

import { Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

/** The base32 secret for manual entry, grouped for readability, with copy. */
export function SecretKey({ secret }: { secret: string }) {
  const grouped = secret.match(/.{1,4}/g)?.join(' ') ?? secret
  return (
    <div className="flex w-full flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground">Or enter this key manually</span>
      <div className="flex items-center gap-1">
        <code className="break-all rounded bg-muted px-2 py-1 font-mono text-xs">{grouped}</code>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Copy key"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(secret)
              toast.success('Key copied')
            } catch {
              toast.error('Could not copy the key')
            }
          }}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
