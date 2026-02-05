"use client";

import { ComingSoonPage } from "@/features/shared";
import { FileWarning } from "lucide-react";

export default function FindingsPage() {
  return (
    <ComingSoonPage
      title="Findings"
      description="Consolidated view of all security findings across your organization."
      phase="Insights"
      icon={FileWarning}
      features={[
        "Unified findings dashboard",
        "Advanced filtering and search",
        "Finding deduplication",
        "Severity and status tracking",
        "Export and sharing options",
      ]}
    />
  );
}
