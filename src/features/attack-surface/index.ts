// Hooks
export { useAttackSurfaceStats } from './hooks/use-attack-surface'
export type {
  AttackSurfaceStats,
  AssetTypeBreakdown,
  ExposedService,
  AssetChange,
} from './hooks/use-attack-surface'

export { useAttackPathScoring } from './hooks/use-attack-path-scoring'
export type {
  AttackPathScoring,
  AttackPathScore,
  AttackPathSummary,
} from './hooks/use-attack-path-scoring'

export { useExposureChains } from './hooks/use-exposure-chains'
export type {
  ExposureChains,
  ExposureChain,
  ExposureChainSummary,
  ChainHop,
} from './hooks/use-exposure-chains'
