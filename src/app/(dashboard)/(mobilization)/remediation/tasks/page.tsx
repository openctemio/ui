"use client";

import { ComingSoonPage } from "@/features/shared";
import { ListChecks } from "lucide-react";

export default function AllTasksPage() {
  return (
    <ComingSoonPage
      title="All Remediation Tasks"
      description="Centralized view of all remediation tasks across your organization."
      phase="Mobilization"
      icon={ListChecks}
      features={[
        "Task list with advanced filtering",
        "Bulk task management",
        "Assignment and ownership tracking",
        "Due date and SLA monitoring",
        "Progress tracking and updates",
      ]}
    />
  );
}
