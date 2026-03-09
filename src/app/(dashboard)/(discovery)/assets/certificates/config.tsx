'use client'

import { Badge } from '@/components/ui/badge'
import { ShieldCheck, CheckCircle, Clock, XCircle, AlertTriangle, Shield } from 'lucide-react'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'
import type { Asset } from '@/features/assets'

// Helper to compute certificate validity status from metadata
type CertStatus = 'valid' | 'expiring' | 'expired'

function getCertStatus(asset: Asset): CertStatus {
  const notAfter = asset.metadata?.certNotAfter as string | undefined
  if (!notAfter) return 'valid'

  const expiryDate = new Date(notAfter)
  const now = new Date()
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 0) return 'expired'
  if (daysUntilExpiry <= 30) return 'expiring'
  return 'valid'
}

function getDaysUntilExpiry(asset: Asset): number | null {
  const notAfter = asset.metadata?.certNotAfter as string | undefined
  if (!notAfter) return null

  const expiryDate = new Date(notAfter)
  const now = new Date()
  return Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function CertStatusBadge({ status }: { status: CertStatus }) {
  switch (status) {
    case 'valid':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-600">
          <CheckCircle className="h-3.5 w-3.5" />
          Valid
        </span>
      )
    case 'expiring':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs font-medium text-yellow-600">
          <Clock className="h-3.5 w-3.5" />
          Expiring
        </span>
      )
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-600">
          <XCircle className="h-3.5 w-3.5" />
          Expired
        </span>
      )
    default:
      return null
  }
}

export const certificatesConfig: AssetPageConfig = {
  type: 'certificate',
  label: 'Certificate',
  labelPlural: 'Certificates',
  description: 'Manage SSL/TLS certificate assets in your infrastructure',
  icon: ShieldCheck,
  iconColor: 'text-green-500',
  gradientFrom: 'from-green-500/20',
  gradientVia: 'via-green-500/10',

  columns: [
    {
      id: 'issuer',
      header: 'Issuer',
      cell: ({ row }) => {
        const issuer = (row.original.metadata?.certIssuer as string) || '-'
        return <span className="text-muted-foreground">{issuer}</span>
      },
    },
    {
      id: 'validUntil',
      accessorFn: (row) => row.metadata?.certNotAfter || '',
      header: 'Valid Until',
      cell: ({ row }) => {
        const notAfter = row.original.metadata?.certNotAfter as string | undefined
        if (!notAfter) return <span className="text-muted-foreground">-</span>
        return <span className="text-sm">{new Date(notAfter).toLocaleDateString()}</span>
      },
    },
    {
      id: 'daysLeft',
      header: 'Days Left',
      cell: ({ row }) => {
        const days = getDaysUntilExpiry(row.original)
        if (days === null) return <span className="text-muted-foreground">-</span>
        if (days < 0)
          return <span className="font-medium text-red-600">Expired {Math.abs(days)}d ago</span>
        if (days <= 30) return <span className="font-medium text-yellow-600">{days}d</span>
        return <span>{days}d</span>
      },
    },
    {
      id: 'certStatus',
      header: 'Validity',
      cell: ({ row }) => <CertStatusBadge status={getCertStatus(row.original)} />,
    },
  ],

  formFields: [
    {
      name: 'name',
      label: 'Certificate Name / CN',
      type: 'text',
      placeholder: '*.example.com',
      required: true,
    },
    {
      name: 'certIssuer',
      label: 'Issuer',
      type: 'text',
      placeholder: "Let's Encrypt, DigiCert...",
      isMetadata: true,
    },
    {
      name: 'certSubject',
      label: 'Subject',
      type: 'text',
      placeholder: 'CN=*.example.com',
      isMetadata: true,
    },
    {
      name: 'certNotBefore',
      label: 'Valid From',
      type: 'text',
      placeholder: 'YYYY-MM-DD',
      isMetadata: true,
    },
    {
      name: 'certNotAfter',
      label: 'Valid Until',
      type: 'text',
      placeholder: 'YYYY-MM-DD',
      isMetadata: true,
    },
    {
      name: 'certSignatureAlgorithm',
      label: 'Signature Algorithm',
      type: 'text',
      placeholder: 'SHA256withRSA',
      isMetadata: true,
    },
    {
      name: 'certKeySize',
      label: 'Key Size (bits)',
      type: 'text',
      placeholder: '2048',
      isMetadata: true,
    },
    {
      name: 'certSerialNumber',
      label: 'Serial Number',
      type: 'text',
      placeholder: '03:A1:...',
      isMetadata: true,
      fullWidth: true,
    },
    {
      name: 'certSans',
      label: 'Subject Alternative Names (comma separated)',
      type: 'text',
      placeholder: 'example.com, *.example.com, api.example.com',
      isMetadata: true,
      fullWidth: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
      fullWidth: true,
    },
    {
      name: 'tags',
      label: 'Tags',
      type: 'tags',
      placeholder: 'production, wildcard, lets-encrypt',
    },
  ],

  statsCards: [
    {
      title: 'Valid',
      icon: CheckCircle,
      compute: (assets: Asset[]) => assets.filter((a) => getCertStatus(a) === 'valid').length,
      variant: 'success',
    },
    {
      title: 'Expiring Soon',
      icon: Clock,
      compute: (assets: Asset[]) => assets.filter((a) => getCertStatus(a) === 'expiring').length,
      variant: 'warning',
    },
    {
      title: 'Expired',
      icon: XCircle,
      compute: (assets: Asset[]) => assets.filter((a) => getCertStatus(a) === 'expired').length,
      variant: 'danger',
    },
  ],

  customFilter: {
    label: 'Validity',
    options: [
      { label: 'Valid', value: 'valid' },
      { label: 'Expiring', value: 'expiring' },
      { label: 'Expired', value: 'expired' },
    ],
    filterFn: (asset: Asset, value: string) => getCertStatus(asset) === value,
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
      title: 'Validity',
      fields: [
        {
          label: 'Status',
          getValue: (asset: Asset) => {
            const days = getDaysUntilExpiry(asset)
            return (
              <div className="flex items-center gap-3">
                <CertStatusBadge status={getCertStatus(asset)} />
                {days !== null && (
                  <span
                    className={`text-sm ${days < 0 ? 'text-red-600' : 'text-muted-foreground'}`}
                  >
                    {days < 0 ? `Expired ${Math.abs(days)} days ago` : `${days} days remaining`}
                  </span>
                )}
              </div>
            )
          },
          fullWidth: true,
        },
      ],
    },
    {
      title: 'Certificate Details',
      fields: [
        {
          label: 'Issuer',
          getValue: (asset: Asset) => (asset.metadata?.certIssuer as string) || '-',
        },
        {
          label: 'Subject',
          getValue: (asset: Asset) => (asset.metadata?.certSubject as string) || '-',
        },
        {
          label: 'Valid From',
          getValue: (asset: Asset) =>
            asset.metadata?.certNotBefore
              ? new Date(asset.metadata.certNotBefore as string).toLocaleDateString()
              : '-',
        },
        {
          label: 'Valid Until',
          getValue: (asset: Asset) =>
            asset.metadata?.certNotAfter
              ? new Date(asset.metadata.certNotAfter as string).toLocaleDateString()
              : '-',
        },
        {
          label: 'Algorithm',
          getValue: (asset: Asset) => (asset.metadata?.certSignatureAlgorithm as string) || '-',
        },
        {
          label: 'Key Size',
          getValue: (asset: Asset) =>
            asset.metadata?.certKeySize ? `${asset.metadata.certKeySize} bits` : '-',
        },
        {
          label: 'Serial Number',
          getValue: (asset: Asset) => (
            <span className="break-all font-mono text-xs">
              {(asset.metadata?.certSerialNumber as string) || '-'}
            </span>
          ),
        },
        {
          label: 'Wildcard',
          getValue: (asset: Asset) => (asset.metadata?.certIsWildcard ? 'Yes' : 'No'),
        },
      ],
    },
    {
      title: 'Subject Alternative Names',
      fields: [
        {
          label: 'SANs',
          fullWidth: true,
          getValue: (asset: Asset) => {
            const sans = asset.metadata?.certSans as string[] | undefined
            if (!sans || sans.length === 0)
              return <span className="text-muted-foreground">None</span>
            return (
              <div className="flex flex-wrap gap-1">
                {sans.map((san: string) => (
                  <Badge key={san} variant="outline" className="text-xs">
                    {san}
                  </Badge>
                ))}
              </div>
            )
          },
        },
      ],
    },
  ],

  exportFields: [
    { header: 'Certificate', accessor: (a: Asset) => a.name },
    { header: 'Issuer', accessor: (a: Asset) => (a.metadata?.certIssuer as string) || '' },
    { header: 'Subject', accessor: (a: Asset) => (a.metadata?.certSubject as string) || '' },
    { header: 'Valid From', accessor: (a: Asset) => (a.metadata?.certNotBefore as string) || '' },
    { header: 'Valid To', accessor: (a: Asset) => (a.metadata?.certNotAfter as string) || '' },
    {
      header: 'Days Left',
      accessor: (a: Asset) => {
        const days = getDaysUntilExpiry(a)
        return days !== null ? days : ''
      },
    },
    { header: 'Validity', accessor: (a: Asset) => getCertStatus(a) },
    { header: 'Risk Score', accessor: (a: Asset) => a.riskScore },
    { header: 'Findings', accessor: (a: Asset) => a.findingCount },
  ],

  includeGroupSelect: false,
}
