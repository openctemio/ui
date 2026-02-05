"use client";

import { ComingSoonPage } from "@/features/shared";
import { FileWarning } from "lucide-react";

export default function TicketsPage() {
  return (
    <ComingSoonPage
      title="Tickets"
      description="Manage tickets synced with external ticketing systems like Jira and ServiceNow."
      phase="Mobilization"
      icon={FileWarning}
      features={[
        "Bi-directional ticket sync",
        "Jira and ServiceNow integration",
        "Ticket status tracking",
        "Auto-ticket creation",
        "Ticket template management",
      ]}
    />
  );
}
