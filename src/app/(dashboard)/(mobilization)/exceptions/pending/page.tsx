"use client";

import { ComingSoonPage } from "@/features/shared";
import { Clock } from "lucide-react";

export default function PendingReviewPage() {
  return (
    <ComingSoonPage
      title="Pending Review"
      description="Exception requests awaiting review and approval."
      phase="Mobilization"
      icon={Clock}
      features={[
        "Review queue dashboard",
        "Approval workflow",
        "Batch review actions",
        "Escalation for stale requests",
        "Review SLA tracking",
      ]}
    />
  );
}
