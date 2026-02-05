"use client";

import { ComingSoonPage } from "@/features/shared";
import { ClipboardCheck } from "lucide-react";

export default function ComplianceReportsPage() {
  return (
    <ComingSoonPage
      title="Compliance Reports"
      description="Generate compliance reports for regulatory frameworks and audits."
      phase="Insights"
      icon={ClipboardCheck}
      features={[
        "PCI-DSS compliance reports",
        "SOC 2 evidence packages",
        "ISO 27001 gap analysis",
        "GDPR compliance status",
        "Custom framework mapping",
      ]}
    />
  );
}
