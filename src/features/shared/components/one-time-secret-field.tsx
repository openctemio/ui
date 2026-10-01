'use client'

import { useEffect, useId, useState } from 'react'
import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { copyToClipboard } from '@/lib/clipboard'

interface OneTimeSecretFieldProps {
  /** Visible label, also the input's accessible name (e.g. "API key"). */
  label: string
  value: string
  /** What the toast and the buttons call the secret; defaults to the label. */
  noun?: string
}

/**
 * A secret shown once (an API key right after it is created): masked by
 * default, with a show/hide toggle and a copy button. The label is tied to
 * the input and both icon buttons carry an accessible name.
 */
export function OneTimeSecretField({ label, value, noun = label }: OneTimeSecretFieldProps) {
  const inputId = useId()
  const [shown, setShown] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  const handleCopy = async () => {
    if (await copyToClipboard(value)) {
      setCopied(true)
      toast.success(`${noun} copied to clipboard`)
    } else {
      toast.error(`Could not copy the ${noun}`)
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id={inputId}
            readOnly
            type={shown ? 'text' : 'password'}
            value={value}
            className="pe-10 font-mono text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute end-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            aria-label={shown ? `Hide ${noun}` : `Show ${noun}`}
            onClick={() => setShown((s) => !s)}
          >
            {shown ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={copied ? `${noun} copied` : `Copy ${noun}`}
          onClick={handleCopy}
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
