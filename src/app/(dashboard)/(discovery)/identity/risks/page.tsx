"use client";

import { ComingSoonPage } from "@/features/shared";
import { Fingerprint } from "lucide-react";

export default function IdentityRisksPage() {
  return (
    <ComingSoonPage
      title="Identity Risks"
      description="Identify and remediate identity-related security risks across your organization."
      phase="Discovery"
      icon={Fingerprint}
      features={[
        "Weak password detection",
        "MFA coverage analysis",
        "Stale account identification",
        "Permission drift detection",
        "Identity attack path analysis",
      ]}
    />
  );
}
