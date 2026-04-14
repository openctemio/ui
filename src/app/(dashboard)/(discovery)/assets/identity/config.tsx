'use client'

import { Badge } from '@/components/ui/badge'
import { ShieldCheck, User, Key, UserCheck, AlertTriangle, Shield } from 'lucide-react'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'
import type { Asset } from '@/features/assets'

const getIdentityTypeLabel = (asset: Asset): string => {
  switch (asset.subType) {
    case 'iam_user':
      return 'User'
    case 'iam_role':
      return 'Role'
    case 'service_account':
      return 'Service Account'
    default:
      return 'Identity'
  }
}

const getIdentityTypeColor = (label: string): string => {
  switch (label) {
    case 'User':
      return 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
    case 'Role':
      return 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
    case 'Service Account':
      return 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
    default:
      return 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
  }
}

export const identityConfig: AssetPageConfig = {
  type: 'identity',
  label: 'Identity',
  labelPlural: 'Identity & Access',
  description: 'IAM users, roles, and service accounts across cloud providers',
  icon: ShieldCheck,
  iconColor: 'text-indigo-500',
  gradientFrom: 'from-indigo-500/20',
  gradientVia: 'via-indigo-500/10',

  columns: [
    {
      accessorKey: 'subType',
      header: 'Type',
      cell: ({ row }) => {
        const label = getIdentityTypeLabel(row.original)
        return <Badge className={`${getIdentityTypeColor(label)} border-0 text-xs`}>{label}</Badge>
      },
    },
    {
      accessorKey: 'metadata.email',
      header: 'Email / ID',
      cell: ({ row }) => {
        const email = (row.original.metadata as Record<string, unknown>).email as string
        if (!email) return <span className="text-muted-foreground">-</span>
        return <span className="text-sm font-mono">{email}</span>
      },
    },
    {
      accessorKey: 'metadata.provider',
      header: 'Provider',
      cell: ({ row }) => {
        const provider = (row.original.metadata as Record<string, unknown>).provider as string
        if (!provider) return <span className="text-muted-foreground">-</span>
        return (
          <Badge variant="outline" className="uppercase text-xs">
            {provider}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.mfa_enabled',
      header: 'MFA',
      cell: ({ row }) => {
        const mfa = (row.original.metadata as Record<string, unknown>).mfa_enabled
        if (mfa === undefined || mfa === null)
          return <span className="text-muted-foreground">-</span>
        return mfa ? (
          <Badge className="bg-green-500/20 text-green-600 border-0 text-xs">Enabled</Badge>
        ) : (
          <Badge className="bg-red-500/20 text-red-600 border-0 text-xs">Disabled</Badge>
        )
      },
    },
  ],

  formFields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      placeholder: 'e.g., admin-user, deploy-role',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
    },
    {
      name: 'provider',
      label: 'Provider',
      type: 'select',
      isMetadata: true,
      options: [
        { label: 'AWS', value: 'aws' },
        { label: 'GCP', value: 'gcp' },
        { label: 'Azure', value: 'azure' },
        { label: 'Kubernetes', value: 'kubernetes' },
      ],
    },
    {
      name: 'email',
      label: 'Email / ID',
      type: 'text',
      placeholder: 'user@example.com',
      isMetadata: true,
    },
    { name: 'mfa_enabled', label: 'MFA Enabled', type: 'boolean', isMetadata: true },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'admin, production' },
  ],

  statsCards: [
    {
      title: 'Users',
      icon: User,
      compute: (assets) => assets.filter((a) => a.subType === 'iam_user').length,
    },
    {
      title: 'Roles',
      icon: Key,
      compute: (assets) => assets.filter((a) => a.subType === 'iam_role').length,
    },
    {
      title: 'Service Accounts',
      icon: UserCheck,
      compute: (assets) => assets.filter((a) => a.subType === 'service_account').length,
    },
    {
      title: 'With Findings',
      icon: AlertTriangle,
      compute: (assets) => assets.filter((a) => a.findingCount > 0).length,
      variant: 'warning',
    },
  ],

  customFilter: {
    label: 'Identity Type',
    options: [
      { label: 'Users', value: 'iam_user' },
      { label: 'Roles', value: 'iam_role' },
      { label: 'Service Accounts', value: 'service_account' },
    ],
    filterFn: (asset, value) => {
      if (value === 'all') return true
      return asset.subType === value
    },
  },

  copyAction: {
    label: 'Copy Name',
    getValue: (asset: Asset) => asset.name,
  },

  detailStats: [
    {
      icon: Shield,
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
      label: 'Risk Score',
      getValue: (asset: Asset) => asset.riskScore,
    },
    {
      icon: AlertTriangle,
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
      label: 'Findings',
      getValue: (asset: Asset) => asset.findingCount,
    },
  ],

  detailSections: [
    {
      title: 'Identity Information',
      fields: [
        {
          label: 'Identity Type',
          getValue: (asset: Asset) => {
            const label = getIdentityTypeLabel(asset)
            return <Badge className={`${getIdentityTypeColor(label)} border-0`}>{label}</Badge>
          },
        },
        {
          label: 'Provider',
          getValue: (asset: Asset) =>
            ((asset.metadata as Record<string, unknown>).provider as string) || '-',
        },
        {
          label: 'Email / ID',
          getValue: (asset: Asset) =>
            ((asset.metadata as Record<string, unknown>).email as string) || '-',
        },
        {
          label: 'MFA',
          getValue: (asset: Asset) => {
            const mfa = (asset.metadata as Record<string, unknown>).mfa_enabled
            if (mfa === undefined) return '-'
            return mfa ? 'Enabled' : 'Disabled'
          },
        },
        {
          label: 'Last Activity',
          getValue: (asset: Asset) =>
            ((asset.metadata as Record<string, unknown>).lastActivity as string) || '-',
        },
      ],
    },
  ],

  exportFields: [
    { header: 'Name', accessor: (a) => a.name },
    { header: 'Type', accessor: (a) => getIdentityTypeLabel(a) },
    { header: 'Provider', accessor: (a) => (a.metadata as Record<string, unknown>).provider || '' },
    { header: 'Email', accessor: (a) => (a.metadata as Record<string, unknown>).email || '' },
    {
      header: 'MFA',
      accessor: (a) => ((a.metadata as Record<string, unknown>).mfa_enabled ? 'Yes' : 'No'),
    },
    { header: 'Status', accessor: (a) => a.status },
    { header: 'Risk Score', accessor: (a) => a.riskScore },
    { header: 'Findings', accessor: (a) => a.findingCount },
  ],

  includeGroupSelect: true,
}
