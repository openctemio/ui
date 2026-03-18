'use client'

import { useState, useEffect } from 'react'
import { Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardAction,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface EditableCardProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  editContent: React.ReactNode
  onSave: () => Promise<void>
  onCancel?: () => void
  badge?: React.ReactNode
  emptyText?: string
  canEdit?: boolean
}

export function EditableCard({
  title,
  icon,
  children,
  editContent,
  onSave,
  onCancel,
  badge,
  emptyText,
  canEdit = true,
}: EditableCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isEditing) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
          ;(e.target as HTMLElement).blur()
          return
        }
        onCancel?.()
        setIsEditing(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, onCancel])

  async function handleSave() {
    setIsSaving(true)
    try {
      await onSave()
      setIsEditing(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    onCancel?.()
    setIsEditing(false)
  }

  const hasContent =
    children !== null && children !== undefined && children !== false && children !== ''

  return (
    <Card className={cn('group', isEditing && 'ring-2 ring-primary/20')}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
          {badge}
        </CardTitle>
        {canEdit && !isEditing && (
          <CardAction>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="size-4" />
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent>
        {isEditing ? (
          editContent
        ) : hasContent ? (
          children
        ) : (
          <p className="text-sm text-muted-foreground">{emptyText ?? 'No content'}</p>
        )}
      </CardContent>

      {isEditing && (
        <CardFooter className="justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
