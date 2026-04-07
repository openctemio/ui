'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import type { FindingDetail } from '../../../types'

interface Web3PanelProps {
  finding: FindingDetail
}

// Chain names for display
const CHAIN_NAMES: Record<string, string> = {
  ethereum: 'Ethereum',
  bsc: 'BNB Chain',
  polygon: 'Polygon',
  avalanche: 'Avalanche',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  solana: 'Solana',
}

export function Web3Panel({ finding }: Web3PanelProps) {
  const [copied, setCopied] = useState(false)
  const details = finding.web3Details
  if (!details) return null

  if (!details.chain && !details.contractAddress && !details.swcId) return null

  const chainName = details.chain ? CHAIN_NAMES[details.chain.toLowerCase()] || details.chain : ''

  const truncateAddress = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr

  const handleCopy = async () => {
    if (details.contractAddress) {
      await navigator.clipboard.writeText(details.contractAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card className="mx-6 mt-3 border-purple-500/30 bg-purple-500/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-purple-400">Smart Contract Vulnerability</span>
        </div>

        {/* SWC + Chain */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {details.swcId && (
            <Badge variant="outline" className="text-xs font-mono text-purple-400">
              {details.swcId}
            </Badge>
          )}
          {chainName && (
            <span className="text-sm">
              Chain: <span className="font-medium">{chainName}</span>
              {details.chainId != null && (
                <span className="text-muted-foreground"> (ID: {details.chainId})</span>
              )}
            </span>
          )}
        </div>

        {/* Contract address */}
        {details.contractAddress && (
          <div className="mb-3">
            <div className="text-xs text-muted-foreground mb-1">Contract</div>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-muted/50 px-2 py-1 rounded">
                {truncateAddress(details.contractAddress)}
              </code>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Function info */}
        <div className="flex flex-wrap gap-4 text-xs">
          {details.functionSignature && (
            <div>
              <span className="text-muted-foreground">Function: </span>
              <code className="font-mono">{details.functionSignature}</code>
            </div>
          )}
          {details.functionSelector && (
            <div>
              <span className="text-muted-foreground">Selector: </span>
              <code className="font-mono">{details.functionSelector}</code>
            </div>
          )}
          {details.txHash && (
            <div>
              <span className="text-muted-foreground">Tx: </span>
              <code className="font-mono">{truncateAddress(details.txHash)}</code>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
