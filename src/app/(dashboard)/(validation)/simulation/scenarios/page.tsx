"use client";

import { ComingSoonPage } from "@/features/shared";
import { Route } from "lucide-react";

export default function AttackScenariosPage() {
  return (
    <ComingSoonPage
      title="Attack Scenarios"
      description="Library of attack scenarios based on real-world TTPs and threat actor behaviors."
      phase="Validation"
      icon={Route}
      features={[
        "MITRE ATT&CK mapping",
        "Threat actor emulation",
        "Kill chain coverage",
        "Custom scenario builder",
        "Scenario effectiveness metrics",
      ]}
    />
  );
}
