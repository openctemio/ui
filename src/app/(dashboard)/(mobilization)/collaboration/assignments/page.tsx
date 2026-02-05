"use client";

import { ComingSoonPage } from "@/features/shared";
import { Users } from "lucide-react";

export default function AssignmentsPage() {
  return (
    <ComingSoonPage
      title="Assignments"
      description="Manage task assignments and team responsibilities."
      phase="Mobilization"
      icon={Users}
      features={[
        "Bulk assignment management",
        "Assignment history",
        "Workload balancing",
        "Skill-based routing",
        "Assignment notifications",
      ]}
    />
  );
}
