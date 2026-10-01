'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Six-digit authenticator code field: numeric keypad on phones, one-time-code
 * autofill, digits only.
 */
export function OneTimeCodeInput({
  className,
  onChange,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'>) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={6}
      placeholder="123456"
      className={cn('font-mono tracking-widest tabular-nums', className)}
      onChange={(e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6)
        onChange?.(e)
      }}
      {...props}
    />
  )
}
