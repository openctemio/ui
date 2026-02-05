"use client";

import { ComingSoonPage } from "@/features/shared";
import { CheckCircle2 } from "lucide-react";

export default function RiskAcceptancePage() {
  return (
    <ComingSoonPage
      title="Risk Acceptance"
      description="Manage accepted risks with documented justifications and expiration tracking."
      phase="Mobilization"
      icon={CheckCircle2}
      features={[
        "Risk acceptance workflow",
        "Justification documentation",
        "Expiration date tracking",
        "Approval chain management",
        "Periodic review reminders",
      ]}
    />
  );
}
