'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Mail, Phone, Save, Loader2, AlertCircle, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useProfile, useUpdateProfile } from '@/features/account'
import { getErrorMessage } from '@/lib/api/error-handler'

export default function ProfilePage() {
  const { profile, isLoading, isError, error, mutate } = useProfile()
  const { updateProfile, isUpdating } = useUpdateProfile()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  })
  const [hasChanges, setHasChanges] = useState(false)

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
        toast.success('Profile updated successfully')
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update profile'))
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
          <CardDescription>Your name and contact details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Avatar: shows the picture from the identity provider when there is
                one, otherwise initials. There is no picture upload. */}
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24 ring-2 ring-border">
                <AvatarImage src={profile?.avatar_url} alt="" />
                <AvatarFallback className="bg-primary/10 text-2xl">{initials}</AvatarFallback>
              </Avatar>
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
                    <Badge variant="outline" className="border-success/40 text-success">
                      <Check className="h-3 w-3 me-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-warning/40 text-warning">
                      Unverified
                    </Badge>
                  )}
                </div>
                {profile?.auth_provider && profile.auth_provider !== 'local' && (
                  <p className="text-xs text-muted-foreground">
                    Managed by your identity provider ({profile.auth_provider})
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || isUpdating}>
          {isUpdating ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="me-2 h-4 w-4" />
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
