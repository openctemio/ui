"use client";

import { ComingSoonPage } from "@/features/shared";
import { Flame } from "lucide-react";

export default function TasksByPriorityPage() {
  return (
    <ComingSoonPage
      title="Tasks by Priority"
      description="View and manage remediation tasks organized by priority level."
      phase="Mobilization"
      icon={Flame}
      features={[
        "Critical priority queue",
        "Priority-based work queues",
        "Urgency indicators",
        "Priority change history",
        "Auto-prioritization rules",
      ]}
    />
  );
}
