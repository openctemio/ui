"use client";

import { ComingSoonPage } from "@/features/shared";
import { Timer } from "lucide-react";

export default function MTTRPage() {
  return (
    <ComingSoonPage
      title="MTTR Analytics"
      description="Track Mean Time To Remediate across different vulnerability types and teams."
      phase="Insights"
      icon={Timer}
      features={[
        "MTTR by severity level",
        "MTTR by team/owner",
        "MTTR by vulnerability type",
        "Benchmark comparisons",
        "Improvement recommendations",
      ]}
    />
  );
}
