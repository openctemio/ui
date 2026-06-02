'use client'

import { GitBranch } from 'lucide-react'
import { ComingSoonPage } from '@/features/shared'

export default function CICDIntegrationPage() {
  return (
    <ComingSoonPage
      title="CI/CD Integration"
      description="Integrate security scanning into your CI/CD pipelines and gate deployments on findings."
      icon={GitBranch}
      features={[
        'Connect GitHub Actions, GitLab CI, Jenkins, and more',
        'Run security scans automatically on every pipeline run',
        'Block deployments with configurable security gates',
        'Track scan pass/fail history per pipeline',
      ]}
    />
  )
}
