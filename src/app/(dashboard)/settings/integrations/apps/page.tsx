"use client";

import { ComingSoonPage } from "@/features/shared";
import { Puzzle } from "lucide-react";

export default function ConnectedAppsPage() {
  return (
    <ComingSoonPage
      title="Connected Apps"
      description="Manage all connected applications and third-party integrations."
      phase="Settings"
      icon={Puzzle}
      features={[
        "Integration marketplace",
        "OAuth app management",
        "Connection health monitoring",
        "Data sync configuration",
        "Integration logs and debugging",
      ]}
    />
  );
}
