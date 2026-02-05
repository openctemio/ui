"use client";

import { ComingSoonPage } from "@/features/shared";
import { MessageSquare } from "lucide-react";

export default function CommentsPage() {
  return (
    <ComingSoonPage
      title="Comments & Discussions"
      description="Centralized view of all comments and discussions on remediation tasks."
      phase="Mobilization"
      icon={MessageSquare}
      features={[
        "Threaded discussions",
        "Mentions and notifications",
        "Attachment support",
        "Activity timeline",
        "Search across comments",
      ]}
    />
  );
}
