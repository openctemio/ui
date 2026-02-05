"use client";

import { ComingSoonPage } from "@/features/shared";
import { Gauge } from "lucide-react";

export default function ControlEffectivenessPage() {
  return (
    <ComingSoonPage
      title="Control Effectiveness"
      description="Measure and track the effectiveness of your security controls over time."
      phase="Validation"
      icon={Gauge}
      features={[
        "Effectiveness scoring",
        "Detection rate metrics",
        "False positive analysis",
        "Control performance trends",
        "Optimization recommendations",
      ]}
    />
  );
}
