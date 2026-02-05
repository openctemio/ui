'use client'

import { useState, useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import {
  Download,
  FileJson,
  FileText,
  CheckCircle,
  Package,
  Shield,
  Scale,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { getComponentStats, getComponents, SBOM_FORMAT_LABELS } from '@/features/components'
import type { SbomFormat } from '@/features/components'
import { toast } from 'sonner'

type FileFormat = 'json' | 'xml'

export default function SBOMExportPage() {
  const stats = useMemo(() => getComponentStats(), [])
  const components = useMemo(() => getComponents(), [])
  const [exportFormat, setExportFormat] = useState<SbomFormat>('cyclonedx-json')
  const [fileFormat, setFileFormat] = useState<FileFormat>('json')
  const [includeVulnerabilities, setIncludeVulnerabilities] = useState(true)
  const [includeLicenses, setIncludeLicenses] = useState(true)
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    // Simulate export delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Build SBOM data based on format
    const sbomData = {
      bomFormat: exportFormat.includes('cyclonedx') ? 'CycloneDX' : 'SPDX',
      specVersion: exportFormat.split('-')[1] || '1.5',
      version: 1,
      metadata: includeMetadata
        ? {
            timestamp: new Date().toISOString(),
            tools: [{ name: 'Rediver Security Platform', version: '1.0.0' }],
            component: {
              type: 'application',
              name: 'Organization Assets',
            },
          }
        : undefined,
      components: components.map((c) => ({
        type: c.type,
        name: c.name,
        version: c.version,
        purl: c.purl,
        licenses: includeLicenses ? [{ license: { id: c.licenseId, name: c.license } }] : undefined,
        vulnerabilities:
          includeVulnerabilities && c.vulnerabilities.length > 0
            ? c.vulnerabilities.map((v) => ({
                id: v.cveId,
                severity: v.severity,
                cvss: v.cvssScore,
                description: v.title,
              }))
            : undefined,
      })),
    }

    // Generate file
    let content: string
    let filename: string
    let mimeType: string

    if (fileFormat === 'json') {
      content = JSON.stringify(sbomData, null, 2)
      filename = `sbom-${exportFormat}.json`
      mimeType = 'application/json'
    } else {
      // Simple XML conversion (in production, use proper XML library)
      content = `<?xml version="1.0" encoding="UTF-8"?>
<bom xmlns="http://cyclonedx.org/schema/bom/1.5">
  <metadata>
    <timestamp>${new Date().toISOString()}</timestamp>
  </metadata>
  <components>
${components
  .map(
    (c) => `    <component type="${c.type}">
      <name>${c.name}</name>
      <version>${c.version}</version>
      <purl>${c.purl}</purl>
    </component>`
  )
  .join('\n')}
  </components>
</bom>`
      filename = `sbom-${exportFormat}.xml`
      mimeType = 'application/xml'
    }

    // Download file
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    setIsExporting(false)
    toast.success(`SBOM exported as ${filename}`)
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Export SBOM"
          description="Generate Software Bill of Materials in standard formats"
        />

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Components
              </CardDescription>
              <CardTitle className="text-3xl">{stats.totalComponents}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">To be included</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-500" />
                Vulnerabilities
              </CardDescription>
              <CardTitle className="text-3xl text-red-500">{stats.totalVulnerabilities}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {includeVulnerabilities ? 'Included' : 'Excluded'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-blue-500" />
                Licenses
              </CardDescription>
              <CardTitle className="text-3xl text-blue-500">
                {Object.keys(stats.byLicenseCategory || {}).length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {includeLicenses ? 'Included' : 'Excluded'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                Format
              </CardDescription>
              <CardTitle className="text-xl text-green-500">
                {SBOM_FORMAT_LABELS[exportFormat]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{fileFormat.toUpperCase()} output</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Export Configuration */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Export Configuration</CardTitle>
              <CardDescription>Customize your SBOM export settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Format Selection */}
              <div className="space-y-3">
                <Label>SBOM Format</Label>
                <Select
                  value={exportFormat}
                  onValueChange={(v) => setExportFormat(v as SbomFormat)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SBOM_FORMAT_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex flex-wrap items-center gap-2">
                          {value.includes('cyclonedx') ? (
                            <FileJson className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-green-500" />
                          )}
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {exportFormat.includes('cyclonedx')
                    ? 'CycloneDX is widely supported by security tools and CI/CD pipelines'
                    : 'SPDX is an ISO standard format for software bill of materials'}
                </p>
              </div>

              <Separator />

              {/* File Format */}
              <div className="space-y-3">
                <Label>Output Format</Label>
                <RadioGroup
                  value={fileFormat}
                  onValueChange={(v) => setFileFormat(v as FileFormat)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="json" id="json" />
                    <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer">
                      <FileJson className="h-4 w-4" />
                      JSON
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="xml" id="xml" />
                    <Label htmlFor="xml" className="flex items-center gap-2 cursor-pointer">
                      <FileText className="h-4 w-4" />
                      XML
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Include Options */}
              <div className="space-y-4">
                <Label>Include in Export</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="vulnerabilities"
                      checked={includeVulnerabilities}
                      onCheckedChange={(checked) => setIncludeVulnerabilities(!!checked)}
                    />
                    <Label htmlFor="vulnerabilities" className="cursor-pointer">
                      <div className="flex flex-wrap items-center gap-2">
                        <Shield className="h-4 w-4 text-red-500" />
                        Vulnerability Information
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Include CVEs, CVSS scores, and fix versions
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="licenses"
                      checked={includeLicenses}
                      onCheckedChange={(checked) => setIncludeLicenses(!!checked)}
                    />
                    <Label htmlFor="licenses" className="cursor-pointer">
                      <div className="flex flex-wrap items-center gap-2">
                        <Scale className="h-4 w-4 text-blue-500" />
                        License Information
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Include SPDX license identifiers and names
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="metadata"
                      checked={includeMetadata}
                      onCheckedChange={(checked) => setIncludeMetadata(!!checked)}
                    />
                    <Label htmlFor="metadata" className="cursor-pointer">
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                        Document Metadata
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Include timestamp, tool info, and component details
                      </p>
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Export Button */}
              <Button onClick={handleExport} disabled={isExporting} className="w-full" size="lg">
                {isExporting ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Generating SBOM...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export SBOM
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Format Info */}
          <Card>
            <CardHeader>
              <CardTitle>About SBOM Formats</CardTitle>
              <CardDescription>Industry-standard formats for software transparency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <FileJson className="h-5 w-5 text-blue-500" />
                  <h4 className="font-medium">CycloneDX</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Designed for security contexts with comprehensive support for vulnerabilities,
                  licensing, and supply chain metadata.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    OWASP
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    ECMA
                  </Badge>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-green-500/5 border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  <h4 className="font-medium">SPDX</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  ISO/IEC 5962:2021 standard format focused on license compliance and software
                  composition analysis.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    ISO Standard
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Linux Foundation
                  </Badge>
                </div>
              </div>

              <div className="p-4 rounded-lg border">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Compliance Ready
                </h4>
                <p className="text-sm text-muted-foreground">
                  Both formats meet requirements for Executive Order 14028 and other regulatory
                  frameworks requiring software transparency.
                </p>
              </div>

              {stats.componentsInCisaKev > 0 && (
                <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <h4 className="font-medium text-red-600">CISA KEV Notice</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {stats.componentsInCisaKev} component(s) contain vulnerabilities from CISA Known
                    Exploited Vulnerabilities catalog.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
