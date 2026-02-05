"use client";

import { ComingSoonPage } from "@/features/shared";
import { Crown } from "lucide-react";

export default function PrivilegedAccessPage() {
  return (
    <ComingSoonPage
      title="Privileged Access"
      description="Monitor and audit privileged accounts and administrative access across systems."
      phase="Discovery"
      icon={Crown}
      features={[
        "Admin account inventory",
        "Privilege escalation paths",
        "Service account management",
        "Just-in-time access tracking",
        "Privileged session monitoring",
      ]}
    />
  );
}
