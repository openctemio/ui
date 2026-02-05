"use client";

import { ComingSoonPage } from "@/features/shared";
import { BarChart3 } from "lucide-react";

export default function SimulationResultsPage() {
  return (
    <ComingSoonPage
      title="Simulation Results"
      description="Analyze results from attack simulations and identify security gaps."
      phase="Validation"
      icon={BarChart3}
      features={[
        "Detection rate metrics",
        "Prevention effectiveness",
        "Time to detect analysis",
        "Gap identification",
        "Trend analysis over time",
      ]}
    />
  );
}
