"use client";

import { ComingSoonPage } from "@/features/shared";
import { Zap } from "lucide-react";

export default function ThreatFeedsPage() {
  return (
    <ComingSoonPage
      title="Threat Feeds"
      description="Integrate and manage threat intelligence feeds from multiple sources."
      phase="Prioritization"
      icon={Zap}
      features={[
        "STIX/TAXII feed integration",
        "Commercial threat intel feeds",
        "Open source threat data",
        "IOC correlation",
        "Custom feed configuration",
      ]}
    />
  );
}
