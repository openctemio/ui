'use client'

import { Badge } from '@/components/ui/badge'
import { Cloud, Shield, AlertTriangle, DollarSign, CheckCircle } from 'lucide-react'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'

const providerConfig: Record<string, { label: string; color: string }> = {
  aws: { label: 'AWS', color: 'bg-orange-500/15 text-orange-600' },
  gcp: { label: 'GCP', color: 'bg-blue-500/15 text-blue-600' },
  azure: { label: 'Azure', color: 'bg-sky-500/15 text-sky-600' },
  oci: { label: 'OCI', color: 'bg-red-500/15 text-red-600' },
  alibaba: { label: 'Alibaba', color: 'bg-amber-500/15 text-amber-600' },
  digitalocean: { label: 'DigitalOcean', color: 'bg-blue-500/15 text-blue-600' },
}

export const cloudAccountsConfig: AssetPageConfig = {
  type: 'cloud_account',
  label: 'Cloud Account',
  labelPlural: 'Cloud Accounts',
  description: 'AWS accounts, GCP projects, and Azure subscriptions',
  icon: Cloud,
  iconColor: 'text-sky-500',
  gradientFrom: 'from-sky-500/20',
  gradientVia: 'via-sky-500/10',

  columns: [
    {
      accessorKey: 'metadata.cloudProvider',
      header: 'Provider',
      cell: ({ row }) => {
        const key = (row.original.metadata.cloudProvider as string) || ''
        const provider = providerConfig[key] || { label: key, color: '' }
        return (
          <Badge variant="secondary" className={provider.color}>
            {provider.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.accountId',
      header: 'Account ID',
      cell: ({ row }) => (
        <span className="text-sm font-mono text-muted-foreground">
          {(row.original.metadata.accountId as string) || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'metadata.resourceCount',
      header: 'Resources',
      cell: ({ row }) => (
        <span className="font-medium">
          {(row.original.metadata.resourceCount as number) ?? '-'}
        </span>
      ),
    },
    {
      accessorKey: 'metadata.mfaEnabled',
      header: 'Security',
      cell: ({ row }) => {
        const mfa = row.original.metadata.mfaEnabled as boolean | undefined
        const sso = row.original.metadata.ssoEnabled as boolean | undefined
        return (
          <div className="flex gap-2">
            <Badge variant={mfa ? 'default' : 'destructive'} className="text-xs">
              {mfa ? 'MFA' : 'No MFA'}
            </Badge>
            {sso && (
              <Badge variant="secondary" className="text-xs">
                SSO
              </Badge>
            )}
          </div>
        )
      },
    },
  ],

  formFields: [
    {
      name: 'name',
      label: 'Account Name',
      type: 'text',
      placeholder: 'e.g., Production AWS',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
    },
    {
      name: 'cloudProvider',
      label: 'Provider',
      type: 'select',
      isMetadata: true,
      defaultValue: 'aws',
      options: [
        { label: 'AWS', value: 'aws' },
        { label: 'GCP', value: 'gcp' },
        { label: 'Azure', value: 'azure' },
        { label: 'OCI', value: 'oci' },
        { label: 'Alibaba', value: 'alibaba' },
        { label: 'DigitalOcean', value: 'digitalocean' },
      ],
    },
    {
      name: 'accountId',
      label: 'Account ID',
      type: 'text',
      placeholder: 'e.g., 123456789012',
      isMetadata: true,
    },
    {
      name: 'accountAlias',
      label: 'Account Alias',
      type: 'text',
      placeholder: 'e.g., prod-main',
      isMetadata: true,
    },
    {
      name: 'organizationId',
      label: 'Organization ID',
      type: 'text',
      placeholder: 'e.g., o-abc123',
      isMetadata: true,
    },
    {
      name: 'rootEmail',
      label: 'Root Email',
      type: 'text',
      placeholder: 'e.g., aws-root@company.com',
      isMetadata: true,
    },
    {
      name: 'mfaEnabled',
      label: 'MFA Enabled',
      type: 'boolean',
      isMetadata: true,
      defaultValue: false,
    },
    {
      name: 'ssoEnabled',
      label: 'SSO Enabled',
      type: 'boolean',
      isMetadata: true,
      defaultValue: false,
    },
    {
      name: 'resourceCount',
      label: 'Resource Count',
      type: 'number',
      placeholder: '0',
      isMetadata: true,
    },
    {
      name: 'monthlySpend',
      label: 'Monthly Spend ($)',
      type: 'number',
      placeholder: '0',
      isMetadata: true,
    },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'production, aws' },
  ],

  statsCards: [
    {
      title: 'Total Resources',
      icon: Shield,
      compute: (assets) =>
        assets.reduce((acc, a) => acc + (Number(a.metadata.resourceCount) || 0), 0),
    },
    {
      title: 'Without MFA',
      icon: AlertTriangle,
      compute: (assets) => assets.filter((a) => !(a.metadata.mfaEnabled as boolean)).length,
      variant: 'warning',
    },
    {
      title: 'Monthly Spend',
      icon: DollarSign,
      compute: (assets) => {
        const total = assets.reduce((acc, a) => acc + (Number(a.metadata.monthlySpend) || 0), 0)
        return `$${(total / 1000).toFixed(0)}k`
      },
      variant: 'success',
    },
  ],

  customFilter: {
    label: 'Provider',
    options: [
      { label: 'AWS', value: 'aws' },
      { label: 'GCP', value: 'gcp' },
      { label: 'Azure', value: 'azure' },
    ],
    filterFn: (asset, value) => (asset.metadata.cloudProvider as string)?.toLowerCase() === value,
  },

  copyAction: {
    label: 'Copy Account ID',
    getValue: (asset) => (asset.metadata.accountId as string) || asset.name,
  },

  detailStats: [
    {
      icon: Cloud,
      iconBg: 'bg-sky-500/10',
      iconColor: 'text-sky-500',
      label: 'Provider',
      getValue: (asset) => {
        const key = (asset.metadata.cloudProvider as string) || ''
        return providerConfig[key]?.label || key || '-'
      },
    },
    {
      icon: Shield,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      label: 'Resources',
      getValue: (asset) => (asset.metadata.resourceCount as number) ?? 0,
    },
    {
      icon: CheckCircle,
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-500',
      label: 'MFA',
      getValue: (asset) => ((asset.metadata.mfaEnabled as boolean) ? 'Enabled' : 'Disabled'),
    },
  ],

  detailSections: [
    {
      title: 'Account Information',
      fields: [
        {
          label: 'Account ID',
          getValue: (asset) => (
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
              {(asset.metadata.accountId as string) || '-'}
            </code>
          ),
        },
        {
          label: 'Account Alias',
          getValue: (asset) => (asset.metadata.accountAlias as string) || '-',
        },
        {
          label: 'Provider',
          getValue: (asset) => {
            const key = (asset.metadata.cloudProvider as string) || ''
            const provider = providerConfig[key]
            if (!provider) return '-'
            return (
              <Badge variant="secondary" className={provider.color}>
                {provider.label}
              </Badge>
            )
          },
        },
        {
          label: 'Organization ID',
          getValue: (asset) => (
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
              {(asset.metadata.organizationId as string) || '-'}
            </code>
          ),
        },
        {
          label: 'Root Email',
          getValue: (asset) => (asset.metadata.rootEmail as string) || '-',
        },
        {
          label: 'Resource Count',
          getValue: (asset) => (asset.metadata.resourceCount as number) ?? '-',
        },
      ],
    },
    {
      title: 'Security & Compliance',
      fields: [
        {
          label: 'MFA',
          getValue: (asset) => {
            const enabled = asset.metadata.mfaEnabled as boolean | undefined
            return (
              <Badge variant={enabled ? 'default' : 'destructive'} className="text-xs">
                {enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            )
          },
        },
        {
          label: 'SSO',
          getValue: (asset) => {
            const enabled = asset.metadata.ssoEnabled as boolean | undefined
            return (
              <Badge variant={enabled ? 'default' : 'secondary'} className="text-xs">
                {enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            )
          },
        },
        {
          label: 'Monthly Spend',
          getValue: (asset) => {
            const spend = asset.metadata.monthlySpend as number | undefined
            if (!spend) return '-'
            return `$${spend.toLocaleString()}`
          },
        },
      ],
    },
  ],

  exportFields: [
    { header: 'Name', accessor: (a) => a.name },
    { header: 'Provider', accessor: (a) => a.metadata.cloudProvider || '' },
    { header: 'Account ID', accessor: (a) => a.metadata.accountId || '' },
    { header: 'Account Alias', accessor: (a) => a.metadata.accountAlias || '' },
    { header: 'Resources', accessor: (a) => a.metadata.resourceCount || 0 },
    { header: 'MFA Enabled', accessor: (a) => (a.metadata.mfaEnabled ? 'Yes' : 'No') },
    { header: 'SSO Enabled', accessor: (a) => (a.metadata.ssoEnabled ? 'Yes' : 'No') },
    { header: 'Monthly Spend', accessor: (a) => a.metadata.monthlySpend || 0 },
    { header: 'Status', accessor: (a) => a.status },
    { header: 'Risk Score', accessor: (a) => a.riskScore },
    { header: 'Findings', accessor: (a) => a.findingCount },
  ],

  includeGroupSelect: true,
}
