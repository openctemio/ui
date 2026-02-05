"use client";

import { ComingSoonPage } from "@/features/shared";
import { Play } from "lucide-react";

export default function BASCampaignsPage() {
  return (
    <ComingSoonPage
      title="BAS Campaigns"
      description="Create and manage Breach and Attack Simulation campaigns to validate your defenses."
      phase="Validation"
      icon={Play}
      features={[
        "Pre-built attack playbooks",
        "Custom campaign creation",
        "Scheduled simulations",
        "Multi-vector attack chains",
        "Campaign comparison analysis",
      ]}
    />
  );
}
