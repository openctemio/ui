'use client';

import {
  Code,
  Package,
  Globe,
  Key,
  Server,
  Container,
  Search,
  Eye,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolCategory } from '@/lib/api/tool-types';

interface ToolCategoryIconProps {
  category: string; // Accept any string to support custom categories
  className?: string;
}

// Icons for builtin categories
const categoryIcons: Record<string, LucideIcon> = {
  sast: Code,
  sca: Package,
  dast: Globe,
  secrets: Key,
  iac: Server,
  container: Container,
  recon: Search,
  osint: Eye,
};

// Colors for builtin categories
const categoryColors: Record<string, string> = {
  sast: 'text-blue-500',
  sca: 'text-purple-500',
  dast: 'text-orange-500',
  secrets: 'text-red-500',
  iac: 'text-green-500',
  container: 'text-cyan-500',
  recon: 'text-amber-500',
  osint: 'text-pink-500',
};

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  sast: 'SAST',
  sca: 'SCA',
  dast: 'DAST',
  secrets: 'Secrets',
  iac: 'IaC',
  container: 'Container',
  recon: 'Recon',
  osint: 'OSINT',
};

export const CATEGORY_DESCRIPTIONS: Record<ToolCategory, string> = {
  sast: 'Static Application Security Testing',
  sca: 'Software Composition Analysis',
  dast: 'Dynamic Application Security Testing',
  secrets: 'Secret Detection',
  iac: 'Infrastructure as Code',
  container: 'Container Security',
  recon: 'Reconnaissance',
  osint: 'Open Source Intelligence',
};

export function ToolCategoryIcon({ category, className }: ToolCategoryIconProps) {
  const Icon = categoryIcons[category] || Code;
  const colorClass = categoryColors[category] || 'text-muted-foreground';

  return <Icon className={cn(colorClass, className)} />;
}

export function getCategoryColor(category: string): string {
  return categoryColors[category] || 'text-muted-foreground';
}

export function getCategoryBadgeColor(category: string): string {
  const colors: Record<string, string> = {
    sast: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    sca: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    dast: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
    secrets: 'bg-red-500/10 text-red-500 border-red-500/30',
    iac: 'bg-green-500/10 text-green-500 border-green-500/30',
    container: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
    recon: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    osint: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
  };
  return colors[category] || 'bg-muted text-muted-foreground';
}
