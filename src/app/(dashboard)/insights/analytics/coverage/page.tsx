"use client";

import { ComingSoonPage } from "@/features/shared";
import { PieChart } from "lucide-react";

export default function CoveragePage() {
  return (
    <ComingSoonPage
      title="Coverage Analytics"
      description="Analyze scan coverage and identify gaps in your security monitoring."
      phase="Insights"
      icon={PieChart}
      features={[
        "Asset coverage metrics",
        "Scan frequency analysis",
        "Coverage gap identification",
        "Control coverage mapping",
        "Coverage improvement tracking",
      ]}
    />
  );
}
