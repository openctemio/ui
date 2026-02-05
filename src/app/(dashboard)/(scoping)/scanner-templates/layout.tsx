import { type ReactNode } from 'react'

/**
 * Scanner Templates Layout
 *
 * Scanner templates are custom YAML/TOML files for Nuclei, Semgrep, and
 * Gitleaks scanners that define security rules and detection patterns.
 */
export default function ScannerTemplatesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
