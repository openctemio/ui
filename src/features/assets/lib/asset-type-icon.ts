import { createElement } from 'react'
import {
  AppWindow,
  Boxes,
  Cloud,
  Cpu,
  Database,
  FolderOpen,
  GitBranch,
  Globe,
  HardDrive,
  HelpCircle,
  Key,
  KeyRound,
  Link,
  Link2,
  LockOpen,
  MonitorSmartphone,
  Network,
  Package,
  Radio,
  Scale,
  Server,
  Shield,
  ShieldCheck,
  Smartphone,
  User,
  UserCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { ASSET_TYPE_ICONS, ASSET_TYPE_LABELS } from '../types/asset.types'

// ASSET_TYPE_ICONS (asset.types.ts) is the single source of which icon each
// asset type uses, stored as lucide names so the types module stays free of
// React imports. This resolves those names to components.
const ICONS_BY_NAME: Record<string, LucideIcon> = {
  AppWindow,
  Boxes,
  Cloud,
  Cpu,
  Database,
  FolderOpen,
  GitBranch,
  Globe,
  HardDrive,
  HelpCircle,
  Key,
  KeyRound,
  Link,
  Link2,
  LockOpen,
  MonitorSmartphone,
  Network,
  Package,
  Radio,
  Scale,
  Server,
  Shield,
  ShieldCheck,
  Smartphone,
  User,
  UserCheck,
  Zap,
}

/** Icon component for an asset type. Unknown types fall back to Package. */
export function getAssetTypeIcon(type: string | undefined): LucideIcon {
  const name = type ? (ASSET_TYPE_ICONS as Record<string, string>)[type] : undefined
  return (name && ICONS_BY_NAME[name]) || Package
}

/** Human label for an asset type ("repository" -> "Repository"). */
export function getAssetTypeLabel(type: string | undefined): string {
  if (!type) return 'Asset'
  return (ASSET_TYPE_LABELS as Record<string, string>)[type] ?? type
}

/**
 * Renders the icon for an asset type. Uses createElement with the resolved
 * module-level icon, so no component is created during render.
 */
export function AssetTypeIcon({ type, className }: { type: string; className?: string }) {
  return createElement(getAssetTypeIcon(type), { className, 'aria-hidden': true })
}
