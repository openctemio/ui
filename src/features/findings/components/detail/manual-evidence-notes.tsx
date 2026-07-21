'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, FileText, ExternalLink, Calendar, User, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { usePermissions } from '@/context/permission-provider'
import { getErrorMessage } from '@/lib/api/error-handler'
import {
  useFindingEvidenceNotes,
  useAddFindingEvidence,
  type FindingEvidenceNote,
} from '../../api/use-finding-evidence'

interface ManualEvidenceNotesSectionProps {
  findingId: string
}

function formatDate(dateString: string): string {
  const d = new Date(dateString)
  return Number.isNaN(d.getTime())
    ? dateString
    : d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

function NoteCard({ note }: { note: FindingEvidenceNote }) {
  const hasUrl = !!note.url
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm whitespace-pre-wrap break-words">{note.description}</p>
          {hasUrl && (
            <a
              href={note.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline break-all"
            >
              {note.url}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          )}
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            {note.type && (
              <Badge variant="outline" className="text-xs">
                {note.type}
              </Badge>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(note.created_at)}
            </span>
            {note.uploaded_by && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {note.uploaded_by}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * ManualEvidenceNotesSection renders operator-authored evidence notes for a
 * finding and (with findings:write) an inline form to add more.
 * Backed by GET/POST /api/v1/findings/{id}/evidence{,/notes}.
 */
export function ManualEvidenceNotesSection({ findingId }: ManualEvidenceNotesSectionProps) {
  const { hasPermission } = usePermissions()
  const canWrite = hasPermission('findings:write')

  const { data, mutate } = useFindingEvidenceNotes(findingId)
  const { trigger: addEvidence, isMutating } = useAddFindingEvidence(findingId)

  const [showForm, setShowForm] = useState(false)
  const [description, setDescription] = useState('')
  const [type, setType] = useState('')
  const [url, setUrl] = useState('')

  const notes = data?.data ?? []

  const resetForm = useCallback(() => {
    setDescription('')
    setType('')
    setUrl('')
    setShowForm(false)
  }, [])

  const handleSubmit = useCallback(async () => {
    const trimmed = description.trim()
    if (!trimmed) {
      toast.error('Description is required')
      return
    }
    try {
      await addEvidence({
        description: trimmed,
        type: type.trim() || undefined,
        url: url.trim() || undefined,
      })
      toast.success('Evidence added')
      resetForm()
      void mutate()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add evidence'))
    }
  }, [description, type, url, addEvidence, resetForm, mutate])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <FileText className="h-4 w-4" />
          Notes{notes.length > 0 ? ` (${notes.length})` : ''}
        </h3>
        {canWrite && !showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="me-2 h-4 w-4" />
            Add Evidence
          </Button>
        )}
      </div>

      {canWrite && showForm && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="evidence-description">
              Description <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="evidence-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the evidence (e.g. steps to reproduce, observed behaviour)…"
              rows={3}
              disabled={isMutating}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="evidence-type">Type</Label>
              <Input
                id="evidence-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="e.g. log, screenshot, note"
                disabled={isMutating}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evidence-url">URL</Label>
              <Input
                id="evidence-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                disabled={isMutating}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={resetForm} disabled={isMutating}>
              <X className="me-1.5 h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={isMutating || !description.trim()}>
              {isMutating ? (
                <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="me-1.5 h-3.5 w-3.5" />
              )}
              Add Evidence
            </Button>
          </div>
        </div>
      )}

      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      ) : (
        !showForm && (
          <p className="text-muted-foreground text-sm">
            No notes added yet.
            {!canWrite && ' You do not have permission to add evidence.'}
          </p>
        )
      )}
    </div>
  )
}
