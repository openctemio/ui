"use client";

import { ComingSoonPage } from "@/features/shared";
import { Zap } from "lucide-react";

export default function AutomationsPage() {
  return (
    <ComingSoonPage
      title="Automations"
      description="Configure automated actions and integrations for remediation workflows."
      phase="Mobilization"
      icon={Zap}
      features={[
        "Trigger-based automations",
        "Integration with ticketing systems",
        "Auto-assignment rules",
        "Notification automation",
        "Webhook configurations",
      ]}
    />
  );
}
