/**
 * Finding Evidence & Remediation-Step Hooks
 *
 * SWR hooks for the manual evidence-note and remediation-step endpoints that
 * back the finding-detail Evidence / Remediation tabs. These are distinct from
 * the CTEM Stage-4 validation-evidence endpoint (see
 * `useFindingValidationEvidenceApi` in use-findings-api.ts):
 *
 *   - Manual notes:  GET/POST /api/v1/findings/{id}/evidence/notes | /evidence
 *   - Steps:         POST     /api/v1/findings/{id}/remediation/steps
 *
 * Mutations go through the shared api client (`@/lib/api/client`) so the CSRF
 * double-submit header is attached automatically.
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post } from '@/lib/api/client'
import { useTenant } from '@/context/tenant-provider'

// ============================================
// TYPES
// ============================================

/** A single manual evidence note attached to a finding. */
export interface FindingEvidenceNote {
  id: string
  kind: string
  description: string
  type?: string
  url?: string
  created_at: string
  uploaded_by?: string
}

interface FindingEvidenceNotesResponse {
  data: FindingEvidenceNote[]
  total: number
}

/** Payload for POST /findings/{id}/evidence. `description` is required. */
export interface AddFindingEvidenceInput {
  description: string
  type?: string
  url?: string
}

/** Payload for POST /findings/{id}/remediation/steps. */
export interface AddRemediationStepInput {
  step: string
}

/** Response shape from POST /findings/{id}/remediation/steps. */
export interface RemediationStepsResponse {
  steps: string[]
  total: number
}

// ============================================
// HOOKS
// ============================================

/**
 * Fetch the manual evidence notes recorded against a finding.
 * GET /api/v1/findings/{id}/evidence/notes
 */
export function useFindingEvidenceNotes(findingId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const key = currentTenant && findingId ? `/api/v1/findings/${findingId}/evidence/notes` : null

  return useSWR<FindingEvidenceNotesResponse>(
    key,
    (url: string) => get<FindingEvidenceNotesResponse>(url),
    config
  )
}

/**
 * Add a manual evidence note to a finding.
 * POST /api/v1/findings/{id}/evidence
 */
export function useAddFindingEvidence(findingId: string | null) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && findingId ? `/api/v1/findings/${findingId}/evidence` : null,
    async (url: string, { arg }: { arg: AddFindingEvidenceInput }) => {
      return post<FindingEvidenceNote>(url, arg)
    }
  )
}

/**
 * Append a remediation step to a finding.
 * POST /api/v1/findings/{id}/remediation/steps
 */
export function useAddRemediationStep(findingId: string | null) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && findingId ? `/api/v1/findings/${findingId}/remediation/steps` : null,
    async (url: string, { arg }: { arg: AddRemediationStepInput }) => {
      return post<RemediationStepsResponse>(url, arg)
    }
  )
}
