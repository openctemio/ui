"use client";

import { ComingSoonPage } from "@/features/shared";
import { Gauge } from "lucide-react";

export default function ScoringRulesPage() {
  return (
    <ComingSoonPage
      title="Scoring Rules"
      description="Configure custom risk scoring rules and weighting factors."
      phase="Settings"
      icon={Gauge}
      features={[
        "Custom scoring formulas",
        "Weight factor configuration",
        "Business context scoring",
        "Asset criticality weights",
        "Threat intelligence factors",
      ]}
    />
  );
}
