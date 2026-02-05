'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { GitBranch, Plus, Upload, Loader2, X, Link2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

import { ProviderIcon } from '@/features/scm-connections/components/provider-icon'
import {
  createRepositorySchema,
  type CreateRepositoryFormData,
  CRITICALITY_OPTIONS,
  SCOPE_OPTIONS,
  extractRepoNameFromUrl,
  detectProviderFromUrl,
} from '../schemas/repository.schema'
import {
  useCreateRepository,
  useSCMConnections,
  invalidateRepositoriesCache,
  type SCMRepository,
} from '../hooks/use-repositories'
import { AddConnectionDialog } from '@/features/scm-connections/components/add-connection-dialog'
import { SCMRepositorySelector } from './scm-repository-selector'
import type { SCMConnection } from '../types/repository.types'

interface AddRepositoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddRepositoryDialog({ open, onOpenChange, onSuccess }: AddRepositoryDialogProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual')
  const [tagInput, setTagInput] = useState('')
  const [addConnectionOpen, setAddConnectionOpen] = useState(false)
  const [selectedConnection, setSelectedConnection] = useState<SCMConnection | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const { data: connections } = useSCMConnections()
  const { trigger: createRepository, isMutating } = useCreateRepository()

  const form = useForm<CreateRepositoryFormData>({
    resolver: zodResolver(createRepositorySchema),
    defaultValues: {
      url: '',
      name: '',
      criticality: 'medium',
      scope: 'internal',
      description: '',
      tags: [],
      scanEnabled: true,
      syncMetadata: true,
    },
  })

  const watchUrl = form.watch('url')
  const watchTags = form.watch('tags') || []
  const detectedProvider = watchUrl ? detectProviderFromUrl(watchUrl) : null

  // Auto-fill name when URL changes
  useEffect(() => {
    if (watchUrl) {
      const name = extractRepoNameFromUrl(watchUrl)
      if (name && !form.getValues('name')) {
        form.setValue('name', name)
      }
    }
  }, [watchUrl, form])

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase()
    if (trimmedTag && !watchTags.includes(trimmedTag) && watchTags.length < 20) {
      form.setValue('tags', [...watchTags, trimmedTag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    form.setValue(
      'tags',
      watchTags.filter((tag) => tag !== tagToRemove)
    )
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const onSubmit = async (data: CreateRepositoryFormData) => {
    try {
      // Detect provider from URL
      const provider = detectProviderFromUrl(data.url)

      await createRepository({
        name: data.name,
        criticality: data.criticality,
        scope: data.scope,
        exposure: data.exposure,
        description: data.description,
        tags: data.tags,
        // Repository-specific fields
        fullName: data.name,
        webUrl: data.url,
        cloneUrl: data.url.endsWith('.git') ? data.url : `${data.url}.git`,
        provider: provider !== 'local' ? provider : undefined,
        scanEnabled: data.scanEnabled,
      })

      toast.success(`Repository "${data.name}" added successfully`)
      await invalidateRepositoriesCache()
      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add repository'))
    }
  }

  const handleClose = () => {
    form.reset()
    setTagInput('')
    setActiveTab('manual')
    setSelectedConnection(null)
    onOpenChange(false)
  }

  const handleImportRepositories = async (
    repositories: SCMRepository[],
    options: { criticality: string; scope: string; scanEnabled: boolean }
  ) => {
    if (!selectedConnection) return

    setIsImporting(true)
    try {
      // Map provider name to correct type
      const mapProviderToSCMProvider = (provider: string) => {
        if (provider === 'azure') return 'azure_devops'
        return provider as 'github' | 'gitlab' | 'bitbucket' | 'azure_devops'
      }

      // Import repositories one by one
      // In a production app, you'd want a batch endpoint
      for (const repo of repositories) {
        await createRepository({
          name: repo.name,
          criticality: options.criticality as 'critical' | 'high' | 'medium' | 'low',
          scope: options.scope as 'internal' | 'external' | 'partner',
          description: repo.description,
          fullName: repo.full_name,
          webUrl: repo.html_url,
          cloneUrl: repo.clone_url,
          sshUrl: repo.ssh_url,
          provider: mapProviderToSCMProvider(selectedConnection.provider),
          defaultBranch: repo.default_branch,
          visibility: repo.is_private ? 'private' : 'public',
          language: repo.language,
          topics: repo.topics,
          stars: repo.stars,
          forks: repo.forks,
          sizeKb: repo.size,
          externalId: repo.id,
          scmOrganization: selectedConnection.scmOrganization,
          scanEnabled: options.scanEnabled,
        })
      }

      toast.success(
        `Successfully imported ${repositories.length} ${
          repositories.length === 1 ? 'repository' : 'repositories'
        }`
      )
      await invalidateRepositoriesCache()
      handleClose()
      onSuccess?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to import repositories'))
    } finally {
      setIsImporting(false)
    }
  }

  const connectedConnections = connections?.filter((c) => c.status === 'connected') || []

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Add Repository
            </DialogTitle>
            <DialogDescription>
              Add a repository manually or import from your connected SCM providers
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'import')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" className="gap-2">
                <Plus className="h-4 w-4" />
                Manual Entry
              </TabsTrigger>
              <TabsTrigger value="import" className="gap-2">
                <Upload className="h-4 w-4" />
                Import from SCM
              </TabsTrigger>
            </TabsList>

            {/* Manual Entry Tab */}
            <TabsContent value="manual" className="mt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Repository URL */}
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repository URL *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input placeholder="https://github.com/owner/repo" {...field} />
                            {detectedProvider && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <ProviderIcon
                                  provider={detectedProvider}
                                  className="h-4 w-4 text-muted-foreground"
                                />
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>Enter the full URL of the repository</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Repository Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="my-repository" {...field} />
                        </FormControl>
                        <FormDescription>
                          Auto-filled from URL, but you can customize it
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Classification Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="criticality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Criticality *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select criticality" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CRITICALITY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scope"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scope</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select scope" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SCOPE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Brief description of the repository..."
                            className="resize-none"
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label>Tags (Optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddTag}
                        disabled={!tagInput.trim() || watchTags.length >= 20}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {watchTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {watchTags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 rounded-full hover:bg-muted p-0.5"
                              aria-label={`Remove tag ${tag}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Scan Settings */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Settings</Label>
                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name="scanEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              Enable automatic scanning
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="syncMetadata"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              Sync metadata from SCM
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isMutating}>
                      {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Repository
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>

            {/* Import from SCM Tab */}
            <TabsContent value="import" className="mt-4">
              <div className="space-y-4">
                {selectedConnection ? (
                  <SCMRepositorySelector
                    connection={selectedConnection}
                    onBack={() => setSelectedConnection(null)}
                    onImport={handleImportRepositories}
                    isImporting={isImporting}
                  />
                ) : connectedConnections.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <Link2 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="font-medium mb-1">No SCM Connections</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connect your GitHub, GitLab, or Bitbucket account first
                    </p>
                    <Button onClick={() => setAddConnectionOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Connection
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Import from SCM</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Select a connection below to browse and import repositories. You can
                            select multiple repositories to import at once.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Select SCM Connection</Label>
                      <div className="grid gap-2">
                        {connectedConnections.map((connection) => (
                          <button
                            key={connection.id}
                            type="button"
                            className={cn(
                              'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50',
                              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                            )}
                            onClick={() => setSelectedConnection(connection)}
                          >
                            <ProviderIcon provider={connection.provider} className="h-5 w-5" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{connection.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {connection.baseUrl}
                                {connection.scmOrganization && ` / ${connection.scmOrganization}`}
                              </p>
                            </div>
                            <Badge variant="outline" className="shrink-0">
                              Select
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-center pt-2">
                      <Button variant="outline" onClick={() => setAddConnectionOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Another Connection
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AddConnectionDialog open={addConnectionOpen} onOpenChange={setAddConnectionOpen} />
    </>
  )
}
