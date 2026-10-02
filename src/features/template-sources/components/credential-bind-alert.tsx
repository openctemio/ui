'use client'

import { ShieldAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

/** Inline refusal shown in the template source form for CREDENTIAL_BIND_FORBIDDEN. */
export function CredentialBindAlert({ message }: { message: string }) {
  return (
    <Alert variant="destructive" data-testid="credential-bind-error">
      <ShieldAlert className="size-4" />
      <AlertTitle>Credential not allowed</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
