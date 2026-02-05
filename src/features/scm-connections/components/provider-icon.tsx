"use client";

import { Github, Cloud, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

// GitLab custom icon since lucide-react GitlabIcon is just a Cloud
function GitLabIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0118.6 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51L23 13.45a.84.84 0 01-.35.94z" />
    </svg>
  );
}

// Bitbucket custom icon
function BitbucketIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M.778 1.211a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891zM14.52 15.53H9.522l-1.35-7.059h7.668z" />
    </svg>
  );
}

// Azure DevOps custom icon
function AzureDevOpsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 8.877L2.247 5.91l8.405-3.416V.022l7.37 5.393L2.966 8.338v8.225L0 15.707zm24-4.45v14.651l-5.753 4.9-9.303-3.057v3.056l-5.978-7.416 15.057 1.798V5.415z" />
    </svg>
  );
}

interface ProviderIconProps {
  provider: string;
  className?: string;
}

export function ProviderIcon({ provider, className }: ProviderIconProps) {
  switch (provider) {
    case "github":
      return <Github className={cn("h-4 w-4", className)} />;
    case "gitlab":
      return <GitLabIcon className={cn("h-4 w-4", className)} />;
    case "bitbucket":
      return <BitbucketIcon className={cn("h-4 w-4", className)} />;
    case "azure_devops":
      return <AzureDevOpsIcon className={cn("h-4 w-4", className)} />;
    case "codecommit":
      return <Cloud className={cn("h-4 w-4", className)} />;
    default:
      return <GitBranch className={cn("h-4 w-4", className)} />;
  }
}

export const SCM_PROVIDER_COLORS: Record<string, string> = {
  github: "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900",
  gitlab: "bg-orange-600 text-white",
  bitbucket: "bg-blue-600 text-white",
  azure_devops: "bg-blue-500 text-white",
  codecommit: "bg-yellow-600 text-white",
  local: "bg-gray-500 text-white",
};
