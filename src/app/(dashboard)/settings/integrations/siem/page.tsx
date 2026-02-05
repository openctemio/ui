"use client";

import { ComingSoonPage } from "@/features/shared";
import { Shield } from "lucide-react";

export default function SIEMIntegrationPage() {
  return (
    <ComingSoonPage
      title="SIEM/SOAR Integration"
      description="Integrate with Security Information and Event Management platforms."
      phase="Settings"
      icon={Shield}
      features={[
        "Splunk integration",
        "Microsoft Sentinel integration",
        "SOAR playbook triggers",
        "Event forwarding",
        "Alert correlation",
      ]}
    />
  );
}
