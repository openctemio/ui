"use client";

import { ComingSoonPage } from "@/features/shared";
import { GitBranch } from "lucide-react";

export default function CICDIntegrationPage() {
  return (
    <ComingSoonPage
      title="CI/CD Integration"
      description="Integrate security scanning into your CI/CD pipelines."
      phase="Settings"
      icon={GitBranch}
      features={[
        "GitHub Actions integration",
        "GitLab CI integration",
        "Jenkins plugin",
        "Pipeline security gates",
        "Build artifact scanning",
      ]}
    />
  );
}
