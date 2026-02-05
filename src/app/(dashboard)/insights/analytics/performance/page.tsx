"use client";

import { ComingSoonPage } from "@/features/shared";
import { BarChart3 } from "lucide-react";

export default function TeamPerformancePage() {
  return (
    <ComingSoonPage
      title="Team Performance"
      description="Analyze team performance metrics for security remediation activities."
      phase="Insights"
      icon={BarChart3}
      features={[
        "Team velocity metrics",
        "Task completion rates",
        "Quality metrics",
        "Workload distribution",
        "Performance benchmarking",
      ]}
    />
  );
}
