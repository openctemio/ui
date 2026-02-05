"use client";

import { ComingSoonPage } from "@/features/shared";
import { TrendingUp } from "lucide-react";

export default function RiskTrendsPage() {
  return (
    <ComingSoonPage
      title="Risk Trends"
      description="Analyze risk trends over time to understand your security posture evolution."
      phase="Insights"
      icon={TrendingUp}
      features={[
        "Risk score trending",
        "Vulnerability trend analysis",
        "Historical comparisons",
        "Predictive analytics",
        "Seasonal pattern detection",
      ]}
    />
  );
}
