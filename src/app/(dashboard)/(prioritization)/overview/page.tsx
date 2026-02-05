"use client";

import { ComingSoonPage } from "@/features/shared";
import { BarChart3 } from "lucide-react";

export default function RiskOverviewPage() {
  return (
    <ComingSoonPage
      title="Risk Overview"
      description="Comprehensive dashboard showing your organization's overall risk posture and key metrics."
      phase="Prioritization"
      icon={BarChart3}
      features={[
        "Risk score trending over time",
        "Top risks by severity and impact",
        "Risk distribution by asset type",
        "Exposure summary dashboard",
        "Risk reduction tracking",
      ]}
    />
  );
}
