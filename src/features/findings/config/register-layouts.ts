/**
 * Register all source layout configurations.
 * This file is imported once in page.tsx to wire up source panels and tab ordering.
 */

import { registerTypeLayout, registerSourceLayout } from './source-layout'
import { SecretPanel } from '../components/detail/source-panels/secret-panel'
import { DependencyPanel } from '../components/detail/source-panels/dependency-panel'
import { MisconfigPanel } from '../components/detail/source-panels/misconfig-panel'
import { DastPanel } from '../components/detail/source-panels/dast-panel'
import { CompliancePanel } from '../components/detail/source-panels/compliance-panel'
import { Web3Panel } from '../components/detail/source-panels/web3-panel'

// Type-specific layouts (highest priority)
registerTypeLayout('secret', {
  sourcePanel: SecretPanel,
  hiddenTabs: ['attack-path'],
})

registerTypeLayout('misconfiguration', {
  sourcePanel: MisconfigPanel,
  hiddenTabs: ['attack-path'],
})

registerTypeLayout('compliance', {
  sourcePanel: CompliancePanel,
  hiddenTabs: ['attack-path'],
})

registerTypeLayout('web3', {
  sourcePanel: Web3Panel,
})

// Source-specific layouts (fallback when findingType is generic 'vulnerability')
registerSourceLayout('dast', {
  sourcePanel: DastPanel,
  hiddenTabs: ['attack-path'],
})

registerSourceLayout('sca', {
  sourcePanel: DependencyPanel,
  hiddenTabs: ['attack-path'],
})

registerSourceLayout('pentest', {
  tabOrder: ['overview', 'pentest', 'evidence', 'remediation', 'related'],
})

registerSourceLayout('bug_bounty', {
  tabOrder: ['overview', 'pentest', 'evidence', 'remediation', 'related'],
})

registerSourceLayout('red_team', {
  tabOrder: ['overview', 'pentest', 'evidence', 'remediation', 'related'],
})
