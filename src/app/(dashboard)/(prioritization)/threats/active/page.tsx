"use client";

import { ComingSoonPage } from "@/features/shared";
import { Flame } from "lucide-react";

export default function ActiveThreatsPage() {
  return (
    <ComingSoonPage
      title="Active Threats"
      description="Real-time intelligence on actively exploited vulnerabilities targeting your infrastructure."
      phase="Prioritization"
      icon={Flame}
      features={[
        "CISA KEV integration",
        "Active exploitation alerts",
        "Threat actor campaign tracking",
        "Zero-day monitoring",
        "Ransomware threat intelligence",
      ]}
    />
  );
}
