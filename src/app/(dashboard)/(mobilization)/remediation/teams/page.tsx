"use client";

import { ComingSoonPage } from "@/features/shared";
import { Users } from "lucide-react";

export default function TasksByTeamPage() {
  return (
    <ComingSoonPage
      title="Tasks by Team"
      description="View remediation tasks organized by team ownership and responsibility."
      phase="Mobilization"
      icon={Users}
      features={[
        "Team workload distribution",
        "Cross-team task visibility",
        "Team performance metrics",
        "Capacity planning view",
        "Escalation workflows",
      ]}
    />
  );
}
