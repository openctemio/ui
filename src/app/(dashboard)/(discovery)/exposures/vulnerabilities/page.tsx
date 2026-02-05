"use client";

import { ComingSoonPage } from "@/features/shared";
import { Bug } from "lucide-react";

export default function VulnerabilitiesPage() {
  return (
    <ComingSoonPage
      title="Vulnerabilities"
      description="Centralized view of all discovered vulnerabilities across your infrastructure and applications."
      phase="Discovery"
      icon={Bug}
      features={[
        "CVE-based vulnerability tracking",
        "CVSS and EPSS scoring",
        "Exploit availability indicators",
        "Affected asset correlation",
        "Remediation guidance and patches",
      ]}
    />
  );
}
