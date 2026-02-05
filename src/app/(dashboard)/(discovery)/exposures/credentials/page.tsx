"use client";

import { ComingSoonPage } from "@/features/shared";
import { KeyRound } from "lucide-react";

export default function CredentialLeaksPage() {
  return (
    <ComingSoonPage
      title="Credential Leaks"
      description="Monitor for leaked credentials and compromised accounts across dark web and breach databases."
      phase="Discovery"
      icon={KeyRound}
      features={[
        "Dark web monitoring",
        "Breach database integration",
        "Employee credential monitoring",
        "Password strength analysis",
        "Automated password reset workflows",
      ]}
    />
  );
}
