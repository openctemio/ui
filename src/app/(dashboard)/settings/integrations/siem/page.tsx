'use client'

import { Shield } from 'lucide-react'
import { ComingSoonPage } from '@/features/shared'

export default function SIEMIntegrationPage() {
  return (
    <ComingSoonPage
      title="SIEM Integration"
      description="Forward security findings, asset changes, and scan results to your SIEM or SOAR platform for centralized monitoring and automated incident response."
      icon={Shield}
      features={[
        'Forward findings to Splunk, Microsoft Sentinel, and other SIEM platforms',
        'Stream events over Syslog (TLS), REST API, or webhooks',
        'Trigger SOAR playbooks for automated incident response',
        'Configurable forwarding rules for findings, scans, asset changes, and SLA breaches',
      ]}
    />
  )
}
