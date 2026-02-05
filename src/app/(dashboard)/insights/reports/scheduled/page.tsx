"use client";

import { ComingSoonPage } from "@/features/shared";
import { Calendar } from "lucide-react";

export default function ScheduledReportsPage() {
  return (
    <ComingSoonPage
      title="Scheduled Reports"
      description="Configure automated report generation and distribution."
      phase="Insights"
      icon={Calendar}
      features={[
        "Schedule recurring reports",
        "Email distribution lists",
        "Report format options (PDF, CSV, JSON)",
        "Report history and archives",
        "Distribution tracking",
      ]}
    />
  );
}
