/**
 * Register all source layout configurations.
 * This file is imported once in page.tsx to wire up hero components.
 *
 * Design decision: Overview is ALWAYS the first/default tab.
 * The hero component provides source-specific context above tabs,
 * so tab reordering is unnecessary. We only control:
 * - heroComponent: source-specific section above tabs
 * - hiddenTabs: tabs that don't apply (e.g., attack-path for non-SAST)
 */

import { registerTypeLayout, registerSourceLayout } from './source-layout'
import { SecretHero } from '../components/detail/heroes/secret-hero'
import { DependencyHero } from '../components/detail/heroes/dependency-hero'
import { MisconfigHero } from '../components/detail/heroes/misconfig-hero'
import { DastHero } from '../components/detail/heroes/dast-hero'
import { ComplianceHero } from '../components/detail/heroes/compliance-hero'
import { Web3Hero } from '../components/detail/heroes/web3-hero'
import { PentestHero } from '../components/detail/heroes/pentest-hero'

// Type-specific layouts (highest priority)
registerTypeLayout('secret', {
  heroComponent: SecretHero,
  hiddenTabs: ['attack-path'],
})

registerTypeLayout('misconfiguration', {
  heroComponent: MisconfigHero,
  hiddenTabs: ['attack-path'],
})

registerTypeLayout('compliance', {
  heroComponent: ComplianceHero,
  hiddenTabs: ['attack-path'],
})

registerTypeLayout('web3', {
  heroComponent: Web3Hero,
})

// Source-specific layouts (fallback when findingType is generic 'vulnerability')
registerSourceLayout('dast', {
  heroComponent: DastHero,
  hiddenTabs: ['attack-path'],
})

registerSourceLayout('sca', {
  heroComponent: DependencyHero,
  hiddenTabs: ['attack-path'],
})

registerSourceLayout('pentest', {
  heroComponent: PentestHero,
})

registerSourceLayout('bug_bounty', {
  heroComponent: PentestHero,
})

registerSourceLayout('red_team', {
  heroComponent: PentestHero,
})
