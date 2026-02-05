"use client";

import { ComingSoonPage } from "@/features/shared";
import { Timer } from "lucide-react";

export default function ResponseTimePage() {
  return (
    <ComingSoonPage
      title="Response Time"
      description="Measure and benchmark your security team's response times to incidents."
      phase="Validation"
      icon={Timer}
      features={[
        "Mean time to detect (MTTD)",
        "Mean time to respond (MTTR)",
        "Response time benchmarking",
        "Trend analysis",
        "Team performance metrics",
      ]}
    />
  );
}
