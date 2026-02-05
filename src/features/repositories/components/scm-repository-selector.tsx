"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  Loader2,
  Lock,
  GitFork,
  Archive,
  Star,
  Check,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { ProviderIcon } from "@/features/scm-connections/components/provider-icon";
import {
  useSCMRepositories,
  type SCMRepository,
} from "../hooks/use-repositories";
import {
  CRITICALITY_OPTIONS,
  SCOPE_OPTIONS,
} from "../schemas/repository.schema";
import type { SCMConnection } from "../types/repository.types";

interface SCMRepositorySelectorProps {
  connection: SCMConnection;
  onBack: () => void;
  onImport: (
    repositories: SCMRepository[],
    options: ImportOptions
  ) => Promise<void>;
  isImporting?: boolean;
}

interface ImportOptions {
  criticality: string;
  scope: string;
  scanEnabled: boolean;
}

export function SCMRepositorySelector({
  connection,
  onBack,
  onImport,
  isImporting = false,
}: SCMRepositorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());

  // Import options
  const [criticality, setCriticality] = useState("medium");
  const [scope, setScope] = useState("internal");
  const [scanEnabled, setScanEnabled] = useState(true);

  // Debounce search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1);
    // Simple debounce using setTimeout
    const handler = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
    return () => clearTimeout(handler);
  }, []);

  const {
    data,
    isLoading,
    error,
  } = useSCMRepositories(connection.id, {
    search: debouncedSearch,
    page,
    perPage: 30,
  });

  const repositories = useMemo(() => data?.repositories || [], [data?.repositories]);
  const hasMore = data?.has_more || false;
  const total = data?.total || 0;

  // Select/deselect handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedRepos.size === repositories.length) {
      setSelectedRepos(new Set());
    } else {
      setSelectedRepos(new Set(repositories.map((r) => r.id)));
    }
  }, [repositories, selectedRepos.size]);

  const toggleSelect = useCallback((repoId: string) => {
    setSelectedRepos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(repoId)) {
        newSet.delete(repoId);
      } else {
        newSet.add(repoId);
      }
      return newSet;
    });
  }, []);

  const selectedRepositories = useMemo(
    () => repositories.filter((r) => selectedRepos.has(r.id)),
    [repositories, selectedRepos]
  );

  const handleImport = async () => {
    await onImport(selectedRepositories, {
      criticality,
      scope,
      scanEnabled,
    });
  };

  const formatSize = (sizeInKB: number): string => {
    if (sizeInKB < 1024) return `${sizeInKB} KB`;
    const sizeInMB = sizeInKB / 1024;
    if (sizeInMB < 1024) return `${sizeInMB.toFixed(1)} MB`;
    return `${(sizeInMB / 1024).toFixed(1)} GB`;
  };

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <ProviderIcon provider={connection.provider} className="h-5 w-5" />
          <div>
            <p className="font-medium">{connection.name}</p>
            <p className="text-xs text-muted-foreground">
              {connection.scmOrganization || connection.baseUrl}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Repository list */}
      <div className="rounded-lg border">
        {/* Select all header */}
        <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={
                repositories.length > 0 &&
                selectedRepos.size === repositories.length
              }
              onCheckedChange={toggleSelectAll}
              disabled={repositories.length === 0}
            />
            <Label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer"
            >
              Select All
            </Label>
          </div>
          <span className="text-sm text-muted-foreground">
            {total > 0 ? `${total} repositories` : "No repositories"}
          </span>
        </div>

        {/* List */}
        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-sm text-muted-foreground">
                Failed to load repositories
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {error.message || "Please try again"}
              </p>
            </div>
          ) : repositories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {debouncedSearch
                  ? "No repositories match your search"
                  : "No repositories found"}
              </p>
            </div>
          ) : (
            repositories.map((repo) => (
              <div
                key={repo.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer transition-colors",
                  selectedRepos.has(repo.id)
                    ? "bg-primary/5"
                    : "hover:bg-muted/50"
                )}
                onClick={() => toggleSelect(repo.id)}
              >
                <Checkbox
                  checked={selectedRepos.has(repo.id)}
                  onCheckedChange={() => toggleSelect(repo.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{repo.name}</span>
                    {repo.is_private && (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    {repo.is_fork && (
                      <GitFork className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    {repo.is_archived && (
                      <Archive className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {repo.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: getLanguageColor(repo.language),
                          }}
                        />
                        {repo.language}
                      </span>
                    )}
                    {repo.stars > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {repo.stars}
                      </span>
                    )}
                    {repo.forks > 0 && (
                      <span className="flex items-center gap-1">
                        <GitFork className="h-3 w-3" />
                        {repo.forks}
                      </span>
                    )}
                    <span>{formatSize(repo.size)}</span>
                  </div>
                </div>
                {selectedRepos.has(repo.id) && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Load more */}
        {hasMore && !isLoading && (
          <div className="flex justify-center border-t py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
            >
              Load more
            </Button>
          </div>
        )}
      </div>

      {/* Import options */}
      {selectedRepos.size > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <p className="text-sm font-medium">Default settings for imported repositories:</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="import-criticality">Criticality</Label>
                <Select value={criticality} onValueChange={setCriticality}>
                  <SelectTrigger id="import-criticality">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRITICALITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="import-scope">Scope</Label>
                <Select value={scope} onValueChange={setScope}>
                  <SelectTrigger id="import-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="import-scan"
                checked={scanEnabled}
                onCheckedChange={(checked) => setScanEnabled(checked as boolean)}
              />
              <Label htmlFor="import-scan" className="text-sm cursor-pointer">
                Enable automatic scanning for imported repositories
              </Label>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <Badge variant="secondary">
          {selectedRepos.size} selected
        </Badge>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedRepos.size === 0 || isImporting}
          >
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import {selectedRepos.size > 0 ? selectedRepos.size : ""} Repositories
          </Button>
        </div>
      </div>
    </div>
  );
}

// Simple language color mapping
function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Go: "#00ADD8",
    Rust: "#dea584",
    Java: "#b07219",
    Ruby: "#701516",
    PHP: "#4F5D95",
    "C#": "#178600",
    "C++": "#f34b7d",
    C: "#555555",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    Scala: "#c22d40",
    Shell: "#89e051",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Vue: "#41b883",
    Svelte: "#ff3e00",
  };
  return colors[language] || "#8b949e";
}
