"use client";

import { ComingSoonPage } from "@/features/shared";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <ComingSoonPage
      title="Notifications"
      description="Configure and manage security notifications and alerts."
      phase="Insights"
      icon={Bell}
      features={[
        "Custom alert rules",
        "Multi-channel delivery (email, Slack, Teams)",
        "Alert prioritization",
        "Notification history",
        "Alert suppression rules",
      ]}
    />
  );
}
