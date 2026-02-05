"use client";

import { ComingSoonPage } from "@/features/shared";
import { Timer } from "lucide-react";

export default function OverdueTasksPage() {
  return (
    <ComingSoonPage
      title="Overdue Tasks"
      description="Track and manage tasks that have exceeded their due dates or SLA."
      phase="Mobilization"
      icon={Timer}
      features={[
        "Overdue task dashboard",
        "SLA breach alerts",
        "Escalation triggers",
        "Root cause analysis",
        "Aging report",
      ]}
    />
  );
}
