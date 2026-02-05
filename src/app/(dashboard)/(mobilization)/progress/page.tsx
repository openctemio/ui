"use client";

import { ComingSoonPage } from "@/features/shared";
import { TrendingUp } from "lucide-react";

export default function ProgressTrackingPage() {
  return (
    <ComingSoonPage
      title="Progress Tracking"
      description="Track remediation progress with KPIs and performance metrics."
      phase="Mobilization"
      icon={TrendingUp}
      features={[
        "Remediation velocity metrics",
        "Backlog trend analysis",
        "Team performance dashboards",
        "Goal tracking and forecasting",
        "Executive summary views",
      ]}
    />
  );
}
