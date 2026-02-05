"use client";

import { ComingSoonPage } from "@/features/shared";
import { FileText } from "lucide-react";

export default function WorkflowTemplatesPage() {
  return (
    <ComingSoonPage
      title="Workflow Templates"
      description="Create and manage reusable workflow templates for common remediation scenarios."
      phase="Mobilization"
      icon={FileText}
      features={[
        "Template library",
        "Custom template creation",
        "Stage and approval configuration",
        "Template versioning",
        "Template sharing across teams",
      ]}
    />
  );
}
