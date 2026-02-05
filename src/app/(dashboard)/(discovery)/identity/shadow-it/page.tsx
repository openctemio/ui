"use client";

import { ComingSoonPage } from "@/features/shared";
import { Eye } from "lucide-react";

export default function ShadowITPage() {
  return (
    <ComingSoonPage
      title="Shadow IT"
      description="Discover unsanctioned applications, services, and cloud resources used within your organization."
      phase="Discovery"
      icon={Eye}
      features={[
        "SaaS application discovery",
        "Unsanctioned cloud service detection",
        "Browser extension monitoring",
        "Data sharing risk analysis",
        "Shadow IT risk scoring",
      ]}
    />
  );
}
