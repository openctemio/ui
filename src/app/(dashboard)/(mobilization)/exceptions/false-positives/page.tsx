"use client";

import { ComingSoonPage } from "@/features/shared";
import { XCircle } from "lucide-react";

export default function FalsePositivesPage() {
  return (
    <ComingSoonPage
      title="False Positives"
      description="Manage and track findings marked as false positives."
      phase="Mobilization"
      icon={XCircle}
      features={[
        "False positive marking workflow",
        "Evidence documentation",
        "Pattern learning for auto-suppression",
        "Review and revalidation",
        "False positive analytics",
      ]}
    />
  );
}
