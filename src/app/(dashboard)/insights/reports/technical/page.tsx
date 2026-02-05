"use client";

import { ComingSoonPage } from "@/features/shared";
import { Cpu } from "lucide-react";

export default function TechnicalReportsPage() {
  return (
    <ComingSoonPage
      title="Technical Reports"
      description="Detailed technical reports for security teams and engineers."
      phase="Insights"
      icon={Cpu}
      features={[
        "Detailed vulnerability reports",
        "Technical remediation guidance",
        "Configuration reports",
        "Asset inventory reports",
        "Custom report builder",
      ]}
    />
  );
}
