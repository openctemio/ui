"use client";

import { ComingSoonPage } from "@/features/shared";
import { Gauge } from "lucide-react";

export default function ExposureScoringPage() {
  return (
    <ComingSoonPage
      title="Exposure Scoring"
      description="Advanced risk scoring combining CVSS, EPSS, business impact, and threat intelligence."
      phase="Prioritization"
      icon={Gauge}
      features={[
        "CVSS and EPSS integration",
        "Business context weighting",
        "Asset criticality factors",
        "Threat actor targeting data",
        "Custom scoring rules",
      ]}
    />
  );
}
