"use client";

import { ComingSoonPage } from "@/features/shared";
import { TrendingUp } from "lucide-react";

export default function TrendingRisksPage() {
  return (
    <ComingSoonPage
      title="Trending Risks"
      description="Monitor emerging risks and trending vulnerabilities that require immediate attention."
      phase="Prioritization"
      icon={TrendingUp}
      features={[
        "New vulnerability tracking",
        "Risk velocity metrics",
        "Emerging threat patterns",
        "Industry-specific trends",
        "Predictive risk analysis",
      ]}
    />
  );
}
