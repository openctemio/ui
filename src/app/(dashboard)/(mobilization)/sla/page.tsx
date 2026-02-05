"use client";

import { ComingSoonPage } from "@/features/shared";
import { Timer } from "lucide-react";

export default function SLAManagementPage() {
  return (
    <ComingSoonPage
      title="SLA Management"
      description="Configure and monitor Service Level Agreements for remediation activities."
      phase="Mobilization"
      icon={Timer}
      features={[
        "SLA policy configuration",
        "Breach monitoring and alerts",
        "SLA compliance reporting",
        "Escalation rule management",
        "Historical SLA performance",
      ]}
    />
  );
}
