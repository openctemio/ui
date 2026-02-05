"use client";

import { ComingSoonPage } from "@/features/shared";
import { Crown } from "lucide-react";

export default function ExecutiveReportsPage() {
  return (
    <ComingSoonPage
      title="Executive Summary"
      description="High-level security reports designed for executive stakeholders."
      phase="Insights"
      icon={Crown}
      features={[
        "Risk posture summary",
        "Key metrics dashboard",
        "Trend highlights",
        "Investment recommendations",
        "Board-ready presentations",
      ]}
    />
  );
}
