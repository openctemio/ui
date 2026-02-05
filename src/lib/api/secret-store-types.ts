/**
 * Secret Store API Types
 *
 * TypeScript types for managing authentication credentials (Git tokens, AWS keys, etc.)
 * Used by template sources for accessing external repositories
 *
 * NOTE: This is different from "credential leaks" which are findings about exposed passwords.
 * Secret Store manages intentional secrets for platform integrations.
 */

// Credential types supported by the secret store
// Must match backend: api_key, basic_auth, bearer_token, ssh_key, aws_role, gcp_service_account, azure_service_principal, github_app, gitlab_token
export const CREDENTIAL_TYPES = [
  'api_key',
  'basic_auth',
  'bearer_token',
  'ssh_key',
  'aws_role',
  'gcp_service_account',
  'azure_service_principal',
  'github_app',
  'gitlab_token',
] as const;

export type CredentialType = (typeof CREDENTIAL_TYPES)[number];

/**
 * Secret Store Credential entity
 */
export interface SecretStoreCredential {
  id: string;
  tenant_id: string;
  name: string;
  credential_type: CredentialType;
  description?: string;

  // Metadata (sensitive data is NOT returned from API)
  key_version: number;
  encryption_algorithm: string;

  // Usage tracking
  last_used_at?: string;
  last_rotated_at?: string;
  expires_at?: string;

  // Audit
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * API Key credential data
 */
export interface APIKeyData {
  key: string;
}

/**
 * Basic Auth credential data
 */
export interface BasicAuthData {
  username: string;
  password: string;
}

/**
 * Bearer Token credential data (for Git tokens, etc.)
 */
export interface BearerTokenData {
  token: string;
}

/**
 * SSH Key credential data
 */
export interface SSHKeyData {
  private_key: string;
  passphrase?: string;
}

/**
 * AWS Role credential data
 */
export interface AWSRoleData {
  role_arn: string;
  external_id?: string;
}

/**
 * GCP Service Account credential data
 */
export interface GCPServiceAccountData {
  json_key: string;
}

/**
 * Azure Service Principal credential data
 */
export interface AzureServicePrincipalData {
  tenant_id: string;
  client_id: string;
  client_secret: string;
}

/**
 * GitHub App credential data
 */
export interface GitHubAppData {
  app_id: string;
  installation_id: string;
  private_key: string;
}

/**
 * GitLab Token credential data
 */
export interface GitLabTokenData {
  token: string;
}

/**
 * Create secret store credential request
 * Structure must match backend - credential data is sent as a flat field based on type
 */
export interface CreateSecretStoreCredentialRequest {
  name: string;
  credential_type: CredentialType;
  description?: string;
  expires_at?: string;
  // Credential data fields (only one should be set based on credential_type)
  api_key?: APIKeyData;
  basic_auth?: BasicAuthData;
  bearer_token?: BearerTokenData;
  ssh_key?: SSHKeyData;
  aws_role?: AWSRoleData;
  gcp_service_account?: GCPServiceAccountData;
  azure_service_principal?: AzureServicePrincipalData;
  github_app?: GitHubAppData;
  gitlab_token?: GitLabTokenData;
}

/**
 * Update secret store credential request
 * Credential data can be updated by providing the appropriate field
 */
export interface UpdateSecretStoreCredentialRequest {
  name?: string;
  description?: string;
  expires_at?: string;
  // Credential data fields (only one should be set based on credential_type)
  api_key?: APIKeyData;
  basic_auth?: BasicAuthData;
  bearer_token?: BearerTokenData;
  ssh_key?: SSHKeyData;
  aws_role?: AWSRoleData;
  gcp_service_account?: GCPServiceAccountData;
  azure_service_principal?: AzureServicePrincipalData;
  github_app?: GitHubAppData;
  gitlab_token?: GitLabTokenData;
}

/**
 * Secret store credential list response
 */
export interface SecretStoreCredentialListResponse {
  items: SecretStoreCredential[];
  total: number;
  page: number;
  per_page: number;
}

/**
 * Secret store credential list filters
 */
export interface SecretStoreCredentialListFilters {
  credential_type?: CredentialType;
  search?: string;
  page?: number;
  per_page?: number;
}

// Credential type display names
export const CREDENTIAL_TYPE_DISPLAY_NAMES: Record<CredentialType, string> = {
  api_key: 'API Key',
  basic_auth: 'Basic Auth',
  bearer_token: 'Bearer Token',
  ssh_key: 'SSH Key',
  aws_role: 'AWS Role',
  gcp_service_account: 'GCP Service Account',
  azure_service_principal: 'Azure Service Principal',
  github_app: 'GitHub App',
  gitlab_token: 'GitLab Token',
};

// Credential type descriptions
export const CREDENTIAL_TYPE_DESCRIPTIONS: Record<CredentialType, string> = {
  api_key: 'API key for HTTP authentication headers',
  basic_auth: 'Username and password for HTTP Basic Authentication',
  bearer_token: 'Bearer token for Git providers (GitHub, GitLab, etc.)',
  ssh_key: 'SSH private key for Git SSH access',
  aws_role: 'AWS IAM role ARN for S3 access via STS AssumeRole',
  gcp_service_account: 'GCP service account JSON key for cloud access',
  azure_service_principal: 'Azure service principal for cloud access',
  github_app: 'GitHub App credentials for fine-grained repository access',
  gitlab_token: 'GitLab personal or project access token',
};

// Credential type icons (Lucide icon names)
export const CREDENTIAL_TYPE_ICONS: Record<CredentialType, string> = {
  api_key: 'Key',
  basic_auth: 'Lock',
  bearer_token: 'GitBranch',
  ssh_key: 'Terminal',
  aws_role: 'Cloud',
  gcp_service_account: 'Cloud',
  azure_service_principal: 'Cloud',
  github_app: 'Github',
  gitlab_token: 'Gitlab',
};

/**
 * Helper to check if credential is expired
 */
export function isCredentialExpired(credential: SecretStoreCredential): boolean {
  if (!credential.expires_at) {
    return false;
  }
  return new Date(credential.expires_at) < new Date();
}

/**
 * Helper to check if credential is expiring soon (within 7 days)
 */
export function isCredentialExpiringSoon(credential: SecretStoreCredential): boolean {
  if (!credential.expires_at) {
    return false;
  }
  const expiresAt = new Date(credential.expires_at);
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  return expiresAt < sevenDaysFromNow && expiresAt >= new Date();
}

/**
 * Helper to format last used time
 */
export function formatLastUsed(lastUsedAt?: string): string {
  if (!lastUsedAt) {
    return 'Never used';
  }
  const date = new Date(lastUsedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}
