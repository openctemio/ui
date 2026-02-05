"use client";

import { ComingSoonPage } from "@/features/shared";
import { KeyRound } from "lucide-react";

export default function APIKeysPage() {
  return (
    <ComingSoonPage
      title="API Keys"
      description="Manage API keys for programmatic access to the platform."
      phase="Settings"
      icon={KeyRound}
      features={[
        "API key generation",
        "Scope and permission control",
        "Key rotation",
        "Usage analytics",
        "Rate limit configuration",
      ]}
    />
  );
}
