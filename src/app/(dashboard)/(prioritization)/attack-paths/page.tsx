"use client";

import { ComingSoonPage } from "@/features/shared";
import { Route } from "lucide-react";

export default function AttackPathAnalysisPage() {
  return (
    <ComingSoonPage
      title="Attack Path Analysis"
      description="Prioritize remediation based on attack path analysis and potential impact."
      phase="Prioritization"
      icon={Route}
      features={[
        "Critical path identification",
        "Choke point prioritization",
        "Blast radius analysis",
        "Fix effectiveness scoring",
        "Path-based risk ranking",
      ]}
    />
  );
}
