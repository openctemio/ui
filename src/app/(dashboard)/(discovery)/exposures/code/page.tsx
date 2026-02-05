"use client";

import { ComingSoonPage } from "@/features/shared";
import { FileCode } from "lucide-react";

export default function CodeIssuesPage() {
  return (
    <ComingSoonPage
      title="Code Issues"
      description="Static application security testing (SAST) findings and code quality issues."
      phase="Discovery"
      icon={FileCode}
      features={[
        "SAST integration and findings",
        "Code vulnerability patterns",
        "Dependency vulnerability analysis",
        "License compliance issues",
        "Code quality metrics",
      ]}
    />
  );
}
