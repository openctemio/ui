"use client";

import { ComingSoonPage } from "@/features/shared";
import { Settings2 } from "lucide-react";

export default function MisconfigurationsPage() {
  return (
    <ComingSoonPage
      title="Misconfigurations"
      description="Identify security misconfigurations in cloud resources, servers, and applications."
      phase="Discovery"
      icon={Settings2}
      features={[
        "Cloud security posture management",
        "CIS benchmark compliance",
        "Infrastructure as Code scanning",
        "Default credential detection",
        "Insecure protocol usage",
      ]}
    />
  );
}
