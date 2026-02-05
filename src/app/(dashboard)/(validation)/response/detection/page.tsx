"use client";

import { ComingSoonPage } from "@/features/shared";
import { Eye } from "lucide-react";

export default function DetectionTestsPage() {
  return (
    <ComingSoonPage
      title="Detection Tests"
      description="Test and validate your detection capabilities against known attack patterns."
      phase="Validation"
      icon={Eye}
      features={[
        "Detection rule testing",
        "Alert generation validation",
        "SIEM integration testing",
        "Detection coverage mapping",
        "Blind spot identification",
      ]}
    />
  );
}
