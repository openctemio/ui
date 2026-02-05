"use client";

import { ComingSoonPage } from "@/features/shared";
import { FileWarning } from "lucide-react";

export default function TicketingIntegrationPage() {
  return (
    <ComingSoonPage
      title="Ticketing Systems"
      description="Connect to Jira, ServiceNow, and other ticketing systems."
      phase="Settings"
      icon={FileWarning}
      features={[
        "Jira Cloud/Server integration",
        "ServiceNow integration",
        "Ticket field mapping",
        "Bi-directional sync",
        "Custom workflow triggers",
      ]}
    />
  );
}
