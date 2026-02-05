"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ComponentEcosystem } from "../types";
import { COMPONENT_ECOSYSTEM_LABELS } from "../types";

const ecosystemColors: Record<ComponentEcosystem, string> = {
  npm: "bg-red-500/15 text-red-600 border-red-500/30",
  pypi: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  maven: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  gradle: "bg-green-500/15 text-green-600 border-green-500/30",
  nuget: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  go: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
  cargo: "bg-orange-600/15 text-orange-700 border-orange-600/30",
  rubygems: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  composer: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
  cocoapods: "bg-pink-500/15 text-pink-600 border-pink-500/30",
  swift: "bg-orange-400/15 text-orange-500 border-orange-400/30",
  pub: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  hex: "bg-violet-500/15 text-violet-600 border-violet-500/30",
  packagist: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
  crates: "bg-orange-600/15 text-orange-700 border-orange-600/30",
  apt: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  yum: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  apk: "bg-teal-500/15 text-teal-600 border-teal-500/30",
  homebrew: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  docker: "bg-blue-600/15 text-blue-700 border-blue-600/30",
  oci: "bg-slate-500/15 text-slate-600 border-slate-500/30",
};

interface EcosystemBadgeProps {
  ecosystem: ComponentEcosystem | string;
  className?: string;
  size?: "sm" | "default";
}

export function EcosystemBadge({ ecosystem, className, size = "default" }: EcosystemBadgeProps) {
  const eco = ecosystem as ComponentEcosystem;
  const label = COMPONENT_ECOSYSTEM_LABELS[eco] || ecosystem;
  const colorClass = ecosystemColors[eco] || "bg-slate-500/15 text-slate-600 border-slate-500/30";

  return (
    <Badge
      variant="outline"
      className={cn(
        colorClass,
        size === "sm" && "text-xs px-1.5 py-0",
        className
      )}
    >
      {label}
    </Badge>
  );
}
