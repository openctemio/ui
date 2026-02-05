/**
 * Identity Types (CTEM Identity & Access Management)
 *
 * Type definitions for identity management, access control, and credential exposure.
 * Critical for CTEM's emphasis on "identity exposure" as a key attack vector.
 */

import type { Severity, Status } from "@/features/shared/types";

// ============================================
// Core Types
// ============================================

/**
 * Identity type classification
 */
export type IdentityType =
  | "user"              // Human user account
  | "admin"             // Privileged human account
  | "service_account"   // Cloud service account (GCP SA, AWS IAM User for services)
  | "iam_role"          // IAM role (AWS, GCP, Azure)
  | "api_key"           // API key or token
  | "oauth_app"         // Third-party OAuth application
  | "bot"               // Bot/automation account
  | "workload"          // Kubernetes service account, workload identity
  | "machine"           // Machine identity (certificate-based)
  | "guest";            // External/guest user

export const IDENTITY_TYPE_LABELS: Record<IdentityType, string> = {
  user: "User",
  admin: "Administrator",
  service_account: "Service Account",
  iam_role: "IAM Role",
  api_key: "API Key",
  oauth_app: "OAuth App",
  bot: "Bot",
  workload: "Workload Identity",
  machine: "Machine Identity",
  guest: "Guest",
};

export const IDENTITY_TYPE_ICONS: Record<IdentityType, string> = {
  user: "User",
  admin: "UserCog",
  service_account: "Bot",
  iam_role: "Shield",
  api_key: "Key",
  oauth_app: "Puzzle",
  bot: "Bot",
  workload: "Container",
  machine: "Server",
  guest: "UserX",
};

export const IDENTITY_TYPE_DESCRIPTIONS: Record<IdentityType, string> = {
  user: "Human user with standard access",
  admin: "Human user with elevated privileges",
  service_account: "Non-human account for service-to-service access",
  iam_role: "IAM role for assuming permissions",
  api_key: "API key or access token",
  oauth_app: "Third-party application with OAuth access",
  bot: "Automated bot or script account",
  workload: "Kubernetes or cloud workload identity",
  machine: "Machine identity using certificates",
  guest: "External or guest user account",
};

/**
 * Identity provider / source
 */
export type IdentityProvider =
  | "local"             // Local/native accounts
  | "azure_ad"          // Microsoft Entra ID (Azure AD)
  | "okta"              // Okta
  | "google"            // Google Workspace
  | "onelogin"          // OneLogin
  | "ping"              // PingIdentity
  | "auth0"             // Auth0
  | "aws_iam"           // AWS IAM
  | "gcp_iam"           // GCP IAM
  | "azure_rbac"        // Azure RBAC
  | "github"            // GitHub
  | "gitlab"            // GitLab
  | "ldap"              // LDAP/Active Directory
  | "saml"              // Generic SAML
  | "oidc";             // Generic OIDC

export const IDENTITY_PROVIDER_LABELS: Record<IdentityProvider, string> = {
  local: "Local",
  azure_ad: "Microsoft Entra ID",
  okta: "Okta",
  google: "Google Workspace",
  onelogin: "OneLogin",
  ping: "PingIdentity",
  auth0: "Auth0",
  aws_iam: "AWS IAM",
  gcp_iam: "GCP IAM",
  azure_rbac: "Azure RBAC",
  github: "GitHub",
  gitlab: "GitLab",
  ldap: "LDAP/AD",
  saml: "SAML",
  oidc: "OIDC",
};

/**
 * Identity risk level
 */
export type IdentityRisk = "critical" | "high" | "medium" | "low" | "none";

export const IDENTITY_RISK_LABELS: Record<IdentityRisk, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
};

export const IDENTITY_RISK_COLORS: Record<IdentityRisk, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-500/15", text: "text-red-600", border: "border-red-500/30" },
  high: { bg: "bg-orange-500/15", text: "text-orange-600", border: "border-orange-500/30" },
  medium: { bg: "bg-yellow-500/15", text: "text-yellow-600", border: "border-yellow-500/30" },
  low: { bg: "bg-blue-500/15", text: "text-blue-600", border: "border-blue-500/30" },
  none: { bg: "bg-green-500/15", text: "text-green-600", border: "border-green-500/30" },
};

/**
 * Risk factors that can affect an identity's risk score
 */
export type IdentityRiskFactor =
  | "no_mfa"                    // MFA not enabled
  | "weak_password"             // Weak or commonly used password
  | "stale_account"             // No activity for extended period
  | "over_privileged"           // More permissions than needed
  | "unused_permissions"        // Granted permissions never used
  | "external_access"           // External/guest access enabled
  | "password_never_rotated"    // Password hasn't been changed
  | "api_key_exposed"           // API key found in code/logs
  | "credential_leaked"         // Credential found in breach
  | "multiple_sessions"         // Concurrent sessions from different locations
  | "impossible_travel"         // Login from geographically impossible locations
  | "dormant_admin"             // Admin account with no recent activity
  | "shared_account"            // Account used by multiple people
  | "no_last_login"             // Never logged in
  | "excessive_failed_logins";  // Many failed login attempts

export const IDENTITY_RISK_FACTOR_LABELS: Record<IdentityRiskFactor, string> = {
  no_mfa: "No MFA",
  weak_password: "Weak Password",
  stale_account: "Stale Account",
  over_privileged: "Over-Privileged",
  unused_permissions: "Unused Permissions",
  external_access: "External Access",
  password_never_rotated: "Password Never Rotated",
  api_key_exposed: "API Key Exposed",
  credential_leaked: "Credential Leaked",
  multiple_sessions: "Multiple Sessions",
  impossible_travel: "Impossible Travel",
  dormant_admin: "Dormant Admin",
  shared_account: "Shared Account",
  no_last_login: "Never Logged In",
  excessive_failed_logins: "Excessive Failed Logins",
};

export const IDENTITY_RISK_FACTOR_SEVERITY: Record<IdentityRiskFactor, Severity> = {
  no_mfa: "high",
  weak_password: "critical",
  stale_account: "medium",
  over_privileged: "high",
  unused_permissions: "low",
  external_access: "medium",
  password_never_rotated: "medium",
  api_key_exposed: "critical",
  credential_leaked: "critical",
  multiple_sessions: "medium",
  impossible_travel: "high",
  dormant_admin: "high",
  shared_account: "high",
  no_last_login: "low",
  excessive_failed_logins: "medium",
};

// ============================================
// Exposed Credential Types
// ============================================

/**
 * Type of exposed credential
 */
export type ExposedCredentialType =
  | "password"          // Plain text password
  | "password_hash"     // Hashed password
  | "api_key"           // API key
  | "access_token"      // OAuth/JWT token
  | "refresh_token"     // Refresh token
  | "private_key"       // SSH/TLS private key
  | "certificate"       // X.509 certificate
  | "aws_key"           // AWS access key
  | "gcp_key"           // GCP service account key
  | "azure_key"         // Azure credential
  | "database_cred"     // Database credentials
  | "ssh_key"           // SSH private key
  | "jwt_secret"        // JWT signing secret
  | "encryption_key";   // Encryption key

export const EXPOSED_CREDENTIAL_TYPE_LABELS: Record<ExposedCredentialType, string> = {
  password: "Password",
  password_hash: "Password Hash",
  api_key: "API Key",
  access_token: "Access Token",
  refresh_token: "Refresh Token",
  private_key: "Private Key",
  certificate: "Certificate",
  aws_key: "AWS Access Key",
  gcp_key: "GCP Service Key",
  azure_key: "Azure Credential",
  database_cred: "Database Credential",
  ssh_key: "SSH Key",
  jwt_secret: "JWT Secret",
  encryption_key: "Encryption Key",
};

/**
 * Source where credential was discovered
 */
export type ExposedCredentialSource =
  | "code_repository"   // Found in source code
  | "commit_history"    // Found in git history
  | "config_file"       // Found in config files
  | "log_file"          // Found in application logs
  | "error_message"     // Found in error messages
  | "api_response"      // Leaked in API response
  | "dark_web"          // Found on dark web
  | "paste_site"        // Found on paste sites
  | "data_breach"       // From known data breach
  | "public_bucket"     // Found in public cloud storage
  | "ci_cd"             // Found in CI/CD logs/configs
  | "docker_image"      // Found in container image
  | "backup"            // Found in backup files
  | "memory_dump";      // Found in memory dump

export const EXPOSED_CREDENTIAL_SOURCE_LABELS: Record<ExposedCredentialSource, string> = {
  code_repository: "Code Repository",
  commit_history: "Commit History",
  config_file: "Config File",
  log_file: "Log File",
  error_message: "Error Message",
  api_response: "API Response",
  dark_web: "Dark Web",
  paste_site: "Paste Site",
  data_breach: "Data Breach",
  public_bucket: "Public Bucket",
  ci_cd: "CI/CD",
  docker_image: "Docker Image",
  backup: "Backup File",
  memory_dump: "Memory Dump",
};

/**
 * Exposed credential instance
 */
export interface ExposedCredential {
  id: string;
  identityId?: string;          // Link to identity if known
  identityName?: string;

  type: ExposedCredentialType;
  source: ExposedCredentialSource;
  severity: Severity;

  // What was found
  credential: string;           // Masked credential (e.g., "AKIA***XYZ")
  context?: string;             // Where/how it was found

  // Source details
  assetId?: string;             // Related asset (repo, container, etc.)
  assetName?: string;
  assetType?: string;
  filePath?: string;
  lineNumber?: number;
  commitHash?: string;

  // Breach details (if from data breach)
  breachName?: string;
  breachDate?: string;

  // Status
  isActive: boolean;            // Still valid/not rotated
  isRevoked: boolean;           // Has been revoked
  revokedAt?: string;

  // Timestamps
  discoveredAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Permission & Access Types
// ============================================

/**
 * Permission / entitlement
 */
export interface Permission {
  id: string;
  name: string;
  description?: string;
  service?: string;           // AWS service, GCP API, etc.
  resource?: string;          // Resource ARN/path
  actions: string[];          // Allowed actions
  effect: "allow" | "deny";
  isPrivileged: boolean;      // High-risk permission
  isUsed: boolean;            // Has been exercised
  lastUsed?: string;
}

/**
 * Group or role membership
 */
export interface GroupMembership {
  id: string;
  name: string;
  type: "group" | "role" | "team";
  provider: IdentityProvider;
  memberCount?: number;
  isPrivileged: boolean;
  permissions?: string[];     // Summary of permissions granted
}

// ============================================
// Main Identity Interface
// ============================================

export interface Identity {
  id: string;

  // Basic info
  type: IdentityType;
  name: string;
  displayName?: string;
  email?: string;
  username?: string;

  // Provider
  provider: IdentityProvider;
  providerId?: string;        // ID in the provider system
  tenantId?: string;          // For multi-tenant providers

  // Status
  status: Status;
  isActive: boolean;
  isLocked: boolean;
  isExternal: boolean;        // External/guest
  isFederated: boolean;       // Federated identity

  // Authentication
  mfaEnabled: boolean;
  mfaType?: "totp" | "sms" | "email" | "push" | "hardware" | "passkey";
  passwordLastChanged?: string;
  passwordNeverExpires: boolean;
  lastLogin?: string;
  lastLoginIp?: string;
  lastLoginLocation?: string;
  loginCount?: number;
  failedLoginCount?: number;

  // Privileges
  isPrivileged: boolean;      // Has admin/elevated access
  isSuperAdmin: boolean;      // Highest privilege level
  permissions: Permission[];
  permissionCount: number;
  groups: GroupMembership[];
  groupCount: number;

  // Access scope
  accessibleAssets: number;   // Count of assets this identity can access
  accessibleResources?: string[];
  cloudAccounts?: string[];   // Cloud accounts this identity has access to

  // Risk assessment
  riskLevel: IdentityRisk;
  riskScore: number;          // 0-100
  riskFactors: IdentityRiskFactor[];

  // Exposed credentials
  exposedCredentials: ExposedCredential[];
  exposedCredentialCount: number;

  // Activity
  lastActivity?: string;
  activityScore?: number;     // Activity level indicator
  dormantDays?: number;       // Days since last activity

  // Metadata
  department?: string;
  title?: string;
  manager?: string;
  costCenter?: string;
  tags?: string[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;         // For temporary accounts
}

// ============================================
// Identity Statistics
// ============================================

export interface IdentityStats {
  totalIdentities: number;

  // By type
  byType: Record<IdentityType, number>;

  // By provider
  byProvider: Record<IdentityProvider, number>;

  // By risk
  byRiskLevel: Record<IdentityRisk, number>;

  // Key metrics
  humanIdentities: number;
  nonHumanIdentities: number;
  privilegedAccounts: number;
  externalAccounts: number;
  dormantAccounts: number;
  accountsWithoutMfa: number;
  overPrivilegedAccounts: number;

  // Credentials
  totalExposedCredentials: number;
  activeExposedCredentials: number;
  credentialsByType: Record<ExposedCredentialType, number>;
  credentialsBySource: Record<ExposedCredentialSource, number>;

  // Risk factors
  topRiskFactors: { factor: IdentityRiskFactor; count: number }[];

  // Average scores
  averageRiskScore: number;
}

// ============================================
// Input Types
// ============================================

export interface IdentityFilters {
  search?: string;
  types?: IdentityType[];
  providers?: IdentityProvider[];
  riskLevels?: IdentityRisk[];
  riskFactors?: IdentityRiskFactor[];
  isPrivileged?: boolean;
  isExternal?: boolean;
  isDormant?: boolean;
  hasMfa?: boolean;
  hasExposedCredentials?: boolean;
  status?: Status;
}

export interface IdentitySortOptions {
  field: "name" | "riskScore" | "lastLogin" | "permissionCount" | "exposedCredentialCount";
  direction: "asc" | "desc";
}

// ============================================
// Access Analysis Types
// ============================================

/**
 * Access path showing how an identity can access a resource
 */
export interface AccessPath {
  identityId: string;
  identityName: string;
  resourceId: string;
  resourceName: string;
  resourceType: string;

  // Path through groups/roles
  path: {
    type: "direct" | "group" | "role" | "inherited";
    name: string;
    id: string;
  }[];

  // Permissions granted
  permissions: string[];
  isPrivileged: boolean;
}

/**
 * Trust relationship between identities/accounts
 */
export interface TrustRelationship {
  id: string;
  sourceType: "account" | "identity" | "role";
  sourceId: string;
  sourceName: string;

  targetType: "account" | "identity" | "role";
  targetId: string;
  targetName: string;

  trustType: "cross-account" | "federation" | "delegation" | "oauth";
  direction: "inbound" | "outbound" | "bidirectional";

  // Conditions
  conditions?: string[];
  externalId?: string;

  // Risk
  riskLevel: IdentityRisk;
  isOverlyPermissive: boolean;

  createdAt: string;
}
