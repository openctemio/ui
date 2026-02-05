"use client";

import { ComingSoonPage } from "@/features/shared";
import { Route } from "lucide-react";

export default function AttackPathsPage() {
  return (
    <ComingSoonPage
      title="Attack Paths"
      description="Visualize and analyze potential attack paths from entry points to critical assets."
      phase="Discovery"
      icon={Route}
      features={[
        "Attack graph visualization",
        "Path to crown jewels analysis",
        "Lateral movement mapping",
        "Blast radius calculation",
        "Choke point identification",
      ]}
    />
  );
}
