"use client";

import { ComingSoonPage } from "@/features/shared";
import { Lock } from "lucide-react";

export default function SecretsExposurePage() {
  return (
    <ComingSoonPage
      title="Secrets Exposure"
      description="Detect exposed API keys, tokens, and secrets in code repositories and public sources."
      phase="Discovery"
      icon={Lock}
      features={[
        "Git repository secret scanning",
        "Public code repository monitoring",
        "API key and token detection",
        "Cloud credential exposure",
        "Secret rotation tracking",
      ]}
    />
  );
}
