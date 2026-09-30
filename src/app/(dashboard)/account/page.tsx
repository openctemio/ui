'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Upload, Save, Loader2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { ErrorState } from '@/features/shared'
import { useProfile, useUpdateProfile, useUpdateAvatar } from '@/features/account'
import { getErrorMessage } from '@/lib/api/error-handler'

export default function ProfilePage() {
  const { profile, isLoading, isError, error, mutate } = useProfile()
  const { updateProfile, isUpdating } = useUpdateProfile()
  const { updateAvatar, removeAvatar, isUpdating: isUpdatingAvatar } = useUpdateAvatar()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null)

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
      })
      setHasChanges(false)
    }
  }, [profile])

  // Track changes
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    const hasAnyChange =
      (field === 'name' ? value : formData.name) !== (profile?.name || '') ||
      (field === 'phone' ? value : formData.phone) !== (profile?.phone || '')
    setHasChanges(hasAnyChange)
  }

  // Save profile
  const handleSave = async () => {
    try {
      const result = await updateProfile(formData)
      if (result) {
        mutate(result)
        setHasChanges(false)
        toast.success('Profile updated')
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update profile'))
    }
  }

  // Handle avatar upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    // Resize and convert to base64
    const img = new Image()
    const canvas = document.createElement('canvas')
    const reader = new FileReader()

    reader.onload = (ev) => {
      img.onload = () => {
        const maxSize = 200
        let w = img.width
        let h = img.height

        if (w > maxSize) {
          h = (h * maxSize) / w
          w = maxSize
        }
        if (h > maxSize) {
          w = (w * maxSize) / h
          h = maxSize
        }

        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, w, h)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        setPendingAvatar(dataUrl)
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Save avatar
  const handleSaveAvatar = async () => {
    if (!pendingAvatar) return

    try {
      const result = await updateAvatar(pendingAvatar)
      if (result) {
        mutate(result)
        setPendingAvatar(null)
        toast.success('Profile picture updated')
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update profile picture'))
    }
  }

  // Remove avatar
  const handleRemoveAvatar = async () => {
    try {
      await removeAvatar()
      mutate()
      setPendingAvatar(null)
      toast.success('Profile picture removed')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to remove profile picture'))
    }
  }

  // Generate initials
  const initials = profile?.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile?.email?.charAt(0).toUpperCase() || 'U'

  if (isLoading) {
    return (
      <div className="grid gap-5">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError) {
    return <ErrorState title="your profile" error={error} onRetry={() => void mutate()} />
  }

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your name, contact details and profile picture.</CardDescription>
          <CardAction>
            <Button size="sm" onClick={handleSave} disabled={!hasChanges || isUpdating}>
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save changes
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-8 lg:flex-row">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4">
              <div className="group relative">
                <Avatar className="h-32 w-32 ring-2 ring-border">
                  <AvatarImage src={pendingAvatar || profile?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-3xl">{initials}</AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-background/70 opacity-0 transition-opacity group-hover:opacity-100">
                  <Upload className="h-8 w-8 text-foreground" />
                  <span className="sr-only">Upload a profile picture</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </label>
              </div>

              {pendingAvatar ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="rounded bg-warning/15 px-2 py-1 text-xs text-warning">
                    Unsaved preview
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingAvatar(null)}
                      disabled={isUpdatingAvatar}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveAvatar} disabled={isUpdatingAvatar}>
                      {isUpdatingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Save picture
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  {/* A visible control: the hover overlay alone can't be reached on touch. */}
                  <Button variant="outline" size="sm" asChild>
                    <label className="cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Upload picture
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                    </label>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Up to 5 MB, resized to 200×200 px
                  </p>
                  {profile?.avatar_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={handleRemoveAvatar}
                      disabled={isUpdatingAvatar}
                    >
                      Remove picture
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Fields */}
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2">
                  <Input id="email" value={profile?.email || ''} disabled className="bg-muted" />
                  {profile?.email_verified ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-success/30 bg-success/10 text-success"
                    >
                      <Check className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-warning/30 bg-warning/10 text-warning"
                    >
                      Unverified
                    </Badge>
                  )}
                </div>
                {profile?.auth_provider !== 'local' && (
                  <p className="text-xs text-muted-foreground">
                    Managed by {profile?.auth_provider}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+84 xxx xxx xxx"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>Read-only details about your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Account ID</dt>
              <dd className="mt-1 break-all font-mono text-sm">{profile?.id || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Sign-in provider</dt>
              <dd className="mt-1 text-sm capitalize">{profile?.auth_provider || 'local'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd className="mt-1 text-sm">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Last updated</dt>
              <dd className="mt-1 text-sm">
                {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : '-'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
