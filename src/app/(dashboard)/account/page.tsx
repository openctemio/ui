'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Mail, Phone, Upload, Save, Loader2, AlertCircle, Check, X } from 'lucide-react'
import { toast } from 'sonner'
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
    bio: '',
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null)

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
      })
      setHasChanges(false)
    }
  }, [profile])

  // Track changes
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    const hasAnyChange =
      (field === 'name' ? value : formData.name) !== (profile?.name || '') ||
      (field === 'phone' ? value : formData.phone) !== (profile?.phone || '') ||
      (field === 'bio' ? value : formData.bio) !== (profile?.bio || '')
    setHasChanges(hasAnyChange)
  }

  // Save profile
  const handleSave = async () => {
    try {
      const result = await updateProfile(formData)
      if (result) {
        mutate(result)
        setHasChanges(false)
        toast.success('Profile updated successfully')
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
        toast.success('Avatar updated successfully')
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update avatar'))
    }
  }

  // Remove avatar
  const handleRemoveAvatar = async () => {
    try {
      await removeAvatar()
      mutate()
      setPendingAvatar(null)
      toast.success('Avatar removed')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to remove avatar'))
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

  // Loading state
  if (isLoading) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load profile: {error?.message || 'Unknown error'}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="grid gap-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal information and profile picture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              {/* Avatar */}
              <div className="relative group">
                <Avatar className="h-32 w-32 ring-2 ring-border">
                  <AvatarImage src={pendingAvatar || profile?.avatar_url} />
                  <AvatarFallback className="text-3xl bg-primary/10">{initials}</AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Upload className="h-8 w-8 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </label>
              </div>

              {/* Avatar Actions */}
              {pendingAvatar ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                    Preview - Unsaved
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingAvatar(null)}
                      disabled={isUpdatingAvatar}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveAvatar} disabled={isUpdatingAvatar}>
                      {isUpdatingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-muted-foreground text-center">
                    Click to upload
                    <br />
                    Max 5MB, 200x200px
                  </p>
                  {profile?.avatar_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={handleRemoveAvatar}
                      disabled={isUpdatingAvatar}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Form Section */}
            <div className="flex-1 space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <div className="flex items-center gap-2">
                  <Input id="email" value={profile?.email || ''} disabled className="bg-muted" />
                  {profile?.email_verified ? (
                    <Badge variant="outline" className="text-green-500 border-green-500/50">
                      <Check className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
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

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+84 xxx xxx xxx"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Tell us a little about yourself..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Brief description for your profile. Max 200 characters.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || isUpdating}>
          {isUpdating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Account Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Details about your account</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Account ID</dt>
              <dd className="text-sm font-mono mt-1">{profile?.id || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Auth Provider</dt>
              <dd className="text-sm mt-1 capitalize">{profile?.auth_provider || 'local'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd className="text-sm mt-1">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
              <dd className="text-sm mt-1">
                {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : '-'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
