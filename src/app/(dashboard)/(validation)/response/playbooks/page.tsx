"use client";

import { ComingSoonPage } from "@/features/shared";
import { FileText } from "lucide-react";

export default function PlaybookTestsPage() {
  return (
    <ComingSoonPage
      title="Playbook Tests"
      description="Validate incident response playbooks through tabletop exercises and simulations."
      phase="Validation"
      icon={FileText}
      features={[
        "Playbook execution testing",
        "Tabletop exercise management",
        "Response procedure validation",
        "Communication flow testing",
        "Improvement recommendations",
      ]}
    />
  );
}
