"use client";

import { ComingSoonPage } from "@/features/shared";
import { AlertTriangle } from "lucide-react";

export default function ControlGapsPage() {
  return (
    <ComingSoonPage
      title="Control Gaps"
      description="Identify gaps in security control coverage and prioritize improvements."
      phase="Validation"
      icon={AlertTriangle}
      features={[
        "Gap identification by threat",
        "Coverage heat maps",
        "Priority recommendations",
        "Investment planning support",
        "Gap closure tracking",
      ]}
    />
  );
}
