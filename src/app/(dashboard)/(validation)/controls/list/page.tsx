"use client";

import { ComingSoonPage } from "@/features/shared";
import { Shield } from "lucide-react";

export default function SecurityControlsPage() {
  return (
    <ComingSoonPage
      title="Security Controls"
      description="Inventory and manage security controls across your environment."
      phase="Validation"
      icon={Shield}
      features={[
        "Control inventory management",
        "Control-to-threat mapping",
        "Coverage gap analysis",
        "Control maturity assessment",
        "Framework alignment (NIST, CIS)",
      ]}
    />
  );
}
