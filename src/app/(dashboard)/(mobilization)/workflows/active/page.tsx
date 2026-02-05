"use client";

import { ComingSoonPage } from "@/features/shared";
import { Play } from "lucide-react";

export default function ActiveWorkflowsPage() {
  return (
    <ComingSoonPage
      title="Active Workflows"
      description="Monitor and manage currently running remediation workflows."
      phase="Mobilization"
      icon={Play}
      features={[
        "Real-time workflow status",
        "Stage progression tracking",
        "Approval queue management",
        "Workflow pause/resume",
        "Exception handling",
      ]}
    />
  );
}
