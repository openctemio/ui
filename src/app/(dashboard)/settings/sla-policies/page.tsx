"use client";

import { ComingSoonPage } from "@/features/shared";
import { Timer } from "lucide-react";

export default function SLAPoliciesPage() {
  return (
    <ComingSoonPage
      title="SLA Policies"
      description="Define Service Level Agreement policies for remediation timelines."
      phase="Settings"
      icon={Timer}
      features={[
        "SLA policy creation",
        "Severity-based timelines",
        "Escalation rules",
        "Business hours configuration",
        "Exception handling",
      ]}
    />
  );
}
