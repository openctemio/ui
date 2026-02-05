"use client";

import { ComingSoonPage } from "@/features/shared";
import { Settings2 } from "lucide-react";

export default function ScopeSettingsPage() {
  return (
    <ComingSoonPage
      title="Scope Settings"
      description="Configure scoping parameters, discovery schedules, and asset classification rules."
      phase="Scoping"
      icon={Settings2}
      features={[
        "Configure discovery frequency",
        "Set asset classification rules",
        "Define exclusion patterns",
        "Manage discovery credentials",
        "Configure notification thresholds",
      ]}
    />
  );
}
