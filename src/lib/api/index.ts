/**
 * API Module
 *
 * Centralized exports for API client, hooks, types, and utilities
 *
 * @example
 * ```typescript
 * // Import API client
 * import { apiClient, get, post } from '@/lib/api'
 *
 * // Import hooks
 * import { useUsers, useCreateUser } from '@/lib/api'
 *
 * // Import security platform hooks
 * import { useAssets, useFindings, useScans } from '@/lib/api'
 *
 * // Import endpoints
 * import { endpoints, securityEndpoints } from '@/lib/api'
 *
 * // Import types
 * import type { User, ApiResponse } from '@/lib/api'
 * ```
 */

// ============================================
// CLIENT
// ============================================

export {
  apiClient,
  get,
  post,
  put,
  patch,
  del,
  uploadFile,
  buildQueryString,
  isAuthenticated,
  getApiBaseUrl,
} from './client'

// ============================================
// ENDPOINTS
// ============================================

export {
  endpoints,
  auth,
  users,
  tenants,
  invitations,
  assets,
  projects,
  components,
  vulnerabilities,
  findings,
  API_BASE,
  buildPaginatedEndpoint,
  buildSearchEndpoint,
  buildSortEndpoint,
} from './endpoints'

// ============================================
// ERROR HANDLING
// ============================================

export {
  ApiClientError,
  handleApiError,
  isRetryableError,
  getRetryDelay,
  retryWithBackoff,
  extractValidationErrors,
  getErrorMessage,
} from './error-handler'

// ============================================
// HOOKS (Base)
// ============================================

export {
  // Current user hooks
  useCurrentUser,
  useUpdateCurrentUser,

  // User management hooks (admin)
  useUser,
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,

  // Tenant hooks (base)
  useTenants,
  useTenant,
  useCreateTenant,
  useUpdateTenant,
  useDeleteTenant,
  useTenantMembers,

  // Vulnerability hooks
  useVulnerabilities,
  useVulnerability,
  useVulnerabilityByCVE,

  // Utilities
  mutateMultiple,
  clearAllCache,
  optimisticUpdate,
  useInfiniteUsers,
  useDependentData,
  usePolling,

  // Config
  defaultSwrConfig,
} from './hooks'

// ============================================
// TYPES
// ============================================

export type {
  // Common types
  ApiResponse,
  ApiError,
  ApiRequestOptions,
  PaginatedResponse,

  // User types
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserListFilters,

  // Tenant types
  Tenant,
  TenantMember,
  TenantInvitation,

  // Vulnerability types
  Vulnerability,
  Finding,

  // Component types
  Component,

  // Asset types
  Asset,

  // Validation types
  ValidationError,
  ValidationErrorResponse,

  // Search types
  SearchFilters,
  SortOptions,

  // Utility types
  UnwrapApiResponse,
  PartialExcept,
  AuthenticatedRequest,
} from './types'

// ============================================
// SECURITY PLATFORM ENDPOINTS
// ============================================

export {
  securityEndpoints,
  assetEndpoints,
  assetGroupEndpoints,
  componentEndpoints,
  findingEndpoints,
  scanEndpoints,
  runnerEndpoints,
  credentialEndpoints,
  pentestEndpoints,
  remediationEndpoints,
  analyticsEndpoints,
  reportEndpoints,
  integrationEndpoints,
  SECURITY_API_BASE,
} from './security-endpoints'

export type {
  PaginationParams,
  AssetFilters,
  FindingFilters,
  ComponentFilters,
  ScanFilters,
} from './security-endpoints'

// ============================================
// PROJECT ENDPOINTS & HOOKS
// ============================================

export { projectEndpoints } from './project-endpoints'

export {
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  getProjectsListKey,
  getProjectKey,
  invalidateProjectsCache,
  defaultProjectSwrConfig,
} from './project-hooks'

export type {
  Project,
  ProjectProvider,
  ProjectVisibility,
  ProjectStatus,
  ProjectScope,
  ProjectExposure,
  ProjectListResponse,
  ProjectFilters,
  CreateProjectRequest,
  UpdateProjectRequest,
} from './project-types'

// ============================================
// USER TENANT MEMBERSHIP
// ============================================

export { useMyTenants, getMyTenantsKey, invalidateMyTenantsCache } from './user-tenant-hooks'

export type { TenantMembership, TenantPlan, TenantRole } from './user-tenant-types'

export { RolePermissions, RoleLabels, RoleColors } from './user-tenant-types'

// ============================================
// SECURITY PLATFORM HOOKS
// ============================================

export {
  // Asset hooks
  useAssets,
  useAssetsByType,
  useAsset,
  useAssetStats,
  useAssetRelationships,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,

  // Asset group hooks
  useAssetGroups,
  useAssetGroup,
  useAssetGroupStats,
  useCreateAssetGroup,
  useUpdateAssetGroup,
  useDeleteAssetGroup,

  // Component (SBOM) hooks
  useComponents,
  useComponent,
  useVulnerableComponents,
  useComponentsByEcosystem,
  useComponentStats,
  useEcosystemStats,
  useLicenseStats,

  // Finding hooks
  useFindings,
  useFinding,
  useFindingStats,
  useFindingsBySeverity,
  useCreateFinding,
  useUpdateFinding,
  useUpdateFindingStatus,
  useAssignFinding,

  // Scan hooks
  useScans,
  useScan,
  useScanStats,
  useScanResults,
  useStartScan,
  useStopScan,

  // Runner hooks
  useRunners,
  useRunner,
  useRunnerStats,
  useCreateRunner,
  useDeleteRunner,

  // Credential leak hooks
  useCredentialLeaks,
  useCredentialLeak,
  useCredentialStats,

  // Remediation hooks
  useRemediationTasks,
  useRemediationTask,
  useRemediationStats,
  useOverdueTasks,
  usePriorityTasks,
  useCreateRemediationTask,
  useUpdateRemediationTask,

  // Pentest hooks
  usePentestCampaigns,
  usePentestCampaign,
  usePentestCampaignStats,
  usePentestFindings,
  usePentestFindingStats,
  usePentestRetests,
  usePentestReports,
  usePentestTemplates,

  // Analytics hooks
  useDashboardAnalytics,
  useRiskTrend,
  useFindingTrend,
  useCoverageAnalytics,
  useMTTRAnalytics,

  // Report hooks
  useReports,
  useReport,
  useGenerateReport,

  // Integration hooks
  useIntegrations,
  useIntegration,
  useIntegrationTypes,
  useCreateIntegration,
  useTestIntegration,
} from './security-hooks'

// Scan Sessions hooks (from scan-hooks)
export {
  useScanSessions,
  useScanSession,
  useScanSessionStats,
  useScanConfigs,
  useScanConfig,
  useScanConfigStats,
  invalidateScanConfigsCache,
  invalidateAllScanConfigCaches,
  type ScanSessionStats,
  type ScanSessionListFilters,
} from './scan-hooks'

export type {
  ScanSession,
  ScanSessionListResponse,
  ScanConfig,
  ScanConfigListResponse,
  ScanConfigListFilters,
  ScanConfigStatsData,
  ScanRunStatus,
  ScanSessionStatus,
} from './scan-types'

export {
  SCAN_RUN_STATUSES,
  SCAN_RUN_STATUS_LABELS,
  SCAN_SESSION_STATUSES,
  SCAN_SESSION_STATUS_LABELS,
  isTerminalStatus,
  isActiveStatus,
  isSuccessStatus,
  isErrorStatus,
} from './scan-types'

// ============================================
// FINDING HOOKS (with typed responses)
// ============================================

export {
  // Finding list/detail hooks
  useFindings as useFindingsTyped,
  useAssetFindings,
  useFinding as useFindingTyped,
  useFindingComments,

  // Finding mutation hooks
  useCreateFinding as useCreateFindingTyped,
  useUpdateFindingStatus as useUpdateFindingStatusTyped,
  useDeleteFinding as useDeleteFindingTyped,
  useAddFindingComment,
  useDeleteFindingComment,

  // Cache utilities
  findingKeys,
  invalidateFindingsCache,
  invalidateAssetFindingsCache,
} from './finding-hooks'

export type {
  Finding as FindingTyped,
  FindingSeverity,
  FindingStatus,
  FindingSource,
  FindingListFilters,
  FindingListResponse,
  CreateFindingRequest,
  UpdateFindingStatusRequest,
  FindingComment,
  AddCommentRequest,
  FindingStats,
} from './finding-types'

export { SEVERITY_CONFIG, STATUS_CONFIG, SOURCE_CONFIG } from './finding-types'

// ============================================
// AUDIT LOG HOOKS & TYPES
// ============================================

export {
  useAuditLogs,
  useAuditLog,
  useAuditLogStats,
  useResourceAuditHistory,
  useUserAuditActivity,
  auditLogKeys,
  invalidateAuditLogsCache,
} from './audit-hooks'

export type {
  AuditAction,
  AuditResourceType,
  AuditResult,
  AuditSeverity,
  AuditChanges,
  AuditLog,
  AuditLogListResponse,
  AuditLogListFilters,
  AuditLogStats,
} from './audit-types'

export { getActionLabel, getSeverityColor, getResultColor, getActionCategory } from './audit-types'

// ============================================
// PIPELINE HOOKS & TYPES
// ============================================

export {
  // Pipeline template hooks
  usePipelines,
  usePipeline,
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
  useActivatePipeline,
  useDeactivatePipeline,
  useClonePipeline,

  // Pipeline step hooks
  useAddStep,
  useUpdateStep,
  useDeleteStep,

  // Pipeline run hooks
  usePipelineRuns,
  usePipelineRun,
  useTriggerPipelineRun,
  useCancelPipelineRun,
  useRetryPipelineRun,

  // Scan management hooks
  useScanManagementStats,
  useQuickScan,

  // Cache utilities
  pipelineKeys,
  pipelineRunKeys,
  scanManagementKeys,
  invalidatePipelinesCache,
  invalidatePipelineRunsCache,
  invalidateScanManagementStatsCache,
  invalidateAllPipelineCaches,
} from './pipeline-hooks'

export type {
  // Pipeline types
  PipelineTemplate,
  PipelineStep,
  PipelineTrigger,
  PipelineSettings,
  PipelineListFilters,
  PipelineListResponse,

  // Pipeline run types
  PipelineRun,
  StepRun,
  PipelineRunListFilters,
  PipelineRunListResponse,

  // Request types
  CreatePipelineRequest,
  UpdatePipelineRequest,
  CreateStepRequest,
  UpdateStepRequest,
  TriggerPipelineRunRequest,
  QuickScanRequest,

  // UI Position for workflow builder
  UIPosition,
  StepCondition,

  // Stats types
  ScanManagementOverview,
  StatusCounts,

  // Enum types
  PipelineTriggerType,
  StepConditionType,
  PipelineRunStatus,
  StepRunStatus,
  PipelineAgentPreference,
} from './pipeline-types'

export {
  PIPELINE_TRIGGERS,
  PIPELINE_TRIGGER_LABELS,
  STEP_CONDITION_TYPES,
  STEP_CONDITION_LABELS,
  PIPELINE_RUN_STATUSES,
  PIPELINE_RUN_STATUS_LABELS,
  STEP_RUN_STATUSES,
  DEFAULT_PIPELINE_SETTINGS,
  PIPELINE_AGENT_PREFERENCES,
  PIPELINE_AGENT_PREFERENCE_LABELS,
  PIPELINE_AGENT_PREFERENCE_DESCRIPTIONS,
} from './pipeline-types'

// ============================================
// PIPELINE & SCAN MANAGEMENT ENDPOINTS
// ============================================

export { pipelineEndpoints, pipelineRunEndpoints, scanManagementEndpoints } from './endpoints'

// ============================================
// WORKFLOW HOOKS & TYPES
// ============================================

export {
  // Workflow hooks
  useWorkflows,
  useWorkflow,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,

  // Workflow node hooks
  useAddNode,
  useUpdateNode,
  useDeleteNode,

  // Workflow edge hooks
  useAddEdge,
  useDeleteEdge,

  // Workflow run hooks
  useWorkflowRuns,
  useWorkflowRun,
  useTriggerWorkflow,
  useCancelWorkflowRun,

  // Cache utilities
  workflowKeys,
  workflowRunKeys,
  invalidateWorkflowsCache,
  invalidateWorkflowRunsCache,
  invalidateAllWorkflowCaches,
} from './workflow-hooks'

export type {
  // Workflow types
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeConfig,
  WorkflowUIPosition,
  WorkflowListFilters,
  WorkflowListResponse,

  // Workflow run types
  WorkflowRun,
  NodeRun,
  WorkflowRunListFilters,
  WorkflowRunListResponse,

  // Request types
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  CreateNodeRequest,
  UpdateNodeRequest,
  CreateEdgeRequest,
  TriggerWorkflowRequest,

  // Enum types
  WorkflowNodeType,
  WorkflowTriggerType,
  WorkflowActionType,
  WorkflowNotificationType,
  WorkflowRunStatus,
  NodeRunStatus,

  // Stats types
  WorkflowStats,
} from './workflow-types'

export {
  WORKFLOW_NODE_TYPES,
  WORKFLOW_NODE_TYPE_LABELS,
  WORKFLOW_TRIGGER_TYPES,
  WORKFLOW_TRIGGER_LABELS,
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_ACTION_LABELS,
  WORKFLOW_NOTIFICATION_TYPES,
  WORKFLOW_NOTIFICATION_LABELS,
  WORKFLOW_RUN_STATUSES,
  WORKFLOW_RUN_STATUS_LABELS,
  NODE_RUN_STATUSES,
} from './workflow-types'

// ============================================
// WORKFLOW ENDPOINTS
// ============================================

export { workflowEndpoints, workflowRunEndpoints } from './endpoints'

// ============================================
// CAPABILITY HOOKS & TYPES
// ============================================

export {
  // Capability hooks
  useCapabilities,
  useAllCapabilities,
  useCapability,
  useCapabilityCategories,
  useCapabilitiesByCategory,
  useCreateCapability,
  useUpdateCapability,
  useDeleteCapability,

  // Capability metadata hook (for icon/color/displayName lookups)
  useCapabilityMetadata,

  // Utility functions
  findCapabilityById,
  findCapabilityByName,
  getCapabilityNameById,
  getCapabilityDisplayNameById,
  getCapabilitiesByNames,

  // Helper functions for capability metadata
  getCapabilityIcon,
  getCapabilityColor,
  getCapabilityDisplayName,
  getCapabilityDescription,

  // Cache utilities
  capabilityKeys,
  invalidateCapabilitiesCache,
} from './capability-hooks'

export type {
  Capability,
  CapabilityListResponse,
  CapabilityListFilters,
  CapabilityAllResponse,
  CapabilityCategoriesResponse,
  CreateCapabilityRequest,
  UpdateCapabilityRequest,
} from './capability-types'

// Fallback constants (deprecated - use helper functions with API data instead)
export {
  CAPABILITY_ICONS,
  CAPABILITY_COLORS,
  FALLBACK_CAPABILITY_ICONS,
  FALLBACK_CAPABILITY_COLORS,
} from './capability-types'

// Validation helpers
export {
  validateCapabilityNames,
  filterValidCapabilityNames,
  isValidCapabilityName,
} from './capability-types'

// ============================================
// CAPABILITY ENDPOINTS
// ============================================

export { capabilityEndpoints, customCapabilityEndpoints } from './endpoints'

// ============================================
// AGENT HOOKS & TYPES
// ============================================

export {
  // Agent list/detail hooks
  useAgents,
  useAgent,
  useAvailableCapabilities,

  // Agent mutation hooks
  useCreateAgent,
  useUpdateAgent,
  useDeleteAgent,
  useBulkDeleteAgents,
  useRegenerateAgentKey,
  useActivateAgent,
  useDeactivateAgent,
  useRevokeAgent,

  // Cache utilities
  agentKeys,
  invalidateAgentsCache,
} from './agent-hooks'

export type {
  Agent,
  AgentType,
  AgentStatus,
  AgentHealth,
  AgentListFilters,
  AgentListResponse,
  CreateAgentRequest,
  CreateAgentResponse,
  UpdateAgentRequest,
  RegenerateAPIKeyResponse,
  AvailableCapabilitiesResponse,
} from './agent-types'

// ============================================
// AGENT ENDPOINTS
// ============================================

export { agentEndpoints } from './endpoints'

// ============================================
// SCAN PROFILE HOOKS & TYPES
// ============================================

export {
  // Scan profile hooks
  useScanProfiles,
  useScanProfile,
  useDefaultScanProfile,
  useCreateScanProfile,
  useUpdateScanProfile,
  useDeleteScanProfile,
  useSetDefaultScanProfile,
  useCloneScanProfile,
  useUpdateQualityGate,

  // Cache utilities
  scanProfileKeys,
  invalidateScanProfilesCache,
} from './scan-profile-hooks'

export type {
  ScanProfile,
  ToolConfig,
  QualityGate,
  QualityGateResult,
  QualityGateBreach,
  FindingCounts,
  ScanProfileListFilters,
  ScanProfileListResponse,
  CreateScanProfileRequest,
  UpdateScanProfileRequest,
  UpdateQualityGateRequest,
  Intensity,
  Severity,
  TemplateMode,
  ScanProfileTool,
  CloneScanProfileRequest,
} from './scan-profile-types'

export {
  SCAN_PROFILE_TOOLS,
  TOOL_DISPLAY_NAMES,
  TOOL_DESCRIPTIONS,
  INTENSITY_DISPLAY_NAMES,
  INTENSITY_DESCRIPTIONS,
  SEVERITY_DISPLAY_NAMES,
  DEFAULT_QUALITY_GATE,
  createDefaultQualityGate,
  isUnlimited,
  TEMPLATE_MODE_DISPLAY_NAMES,
  TEMPLATE_MODE_DESCRIPTIONS,
  // Preset profiles
  PRESET_PROFILES,
  PRESET_PROFILE_TYPES,
  getPresetProfileRequest,
} from './scan-profile-types'

export type { PresetProfileType, PresetProfile } from './scan-profile-types'

// ============================================
// SCAN PROFILE ENDPOINTS
// ============================================

export { scanProfileEndpoints } from './endpoints'

// ============================================
// SCANNER TEMPLATE HOOKS & TYPES
// ============================================

export {
  // Scanner template hooks
  useScannerTemplates,
  useScannerTemplate,
  useCreateScannerTemplate,
  useUpdateScannerTemplate,
  useDeleteScannerTemplate,
  useValidateScannerTemplate,
  useDeprecateScannerTemplate,
  useDownloadScannerTemplate,

  // Cache utilities
  scannerTemplateKeys,
  invalidateScannerTemplatesCache,
} from './scanner-template-hooks'

export type {
  ScannerTemplate,
  TemplateType,
  TemplateStatus,
  SyncSource,
  TemplateValidationError,
  TemplateValidationResult,
  CreateScannerTemplateRequest,
  UpdateScannerTemplateRequest,
  ValidateScannerTemplateRequest,
  ScannerTemplateListFilters,
  ScannerTemplateListResponse,
} from './scanner-template-types'

export {
  TEMPLATE_TYPES,
  TEMPLATE_STATUSES,
  SYNC_SOURCES,
  TEMPLATE_TYPE_DISPLAY_NAMES,
  TEMPLATE_TYPE_DESCRIPTIONS,
  TEMPLATE_TYPE_EXTENSIONS,
  TEMPLATE_TYPE_CONTENT_TYPES,
  TEMPLATE_TYPE_MAX_SIZES,
  TEMPLATE_TYPE_MAX_RULES,
  TEMPLATE_STATUS_DISPLAY_NAMES,
  TEMPLATE_STATUS_COLORS,
  SYNC_SOURCE_DISPLAY_NAMES,
  formatTemplateSize,
  isTemplateEditable,
  isTemplateUsable,
  encodeTemplateContent,
  decodeTemplateContent,
} from './scanner-template-types'

// ============================================
// SCANNER TEMPLATE ENDPOINTS
// ============================================

export { scannerTemplateEndpoints } from './endpoints'

// ============================================
// TEMPLATE SOURCE HOOKS & TYPES
// ============================================

export {
  // Template source hooks
  useTemplateSources,
  useTemplateSource,
  useCreateTemplateSource,
  useUpdateTemplateSource,
  useDeleteTemplateSource,
  useEnableTemplateSource,
  useDisableTemplateSource,
  useSyncTemplateSource,

  // Cache utilities
  templateSourceKeys,
  invalidateTemplateSourcesCache,
  templateSourceEndpoints,
} from './template-source-hooks'

export type {
  TemplateSource,
  SourceType,
  SyncStatus,
  GitSourceConfig,
  S3SourceConfig,
  HTTPSourceConfig,
  TemplateSyncResult,
  CreateTemplateSourceRequest,
  UpdateTemplateSourceRequest,
  TemplateSourceListFilters,
  TemplateSourceListResponse,
} from './template-source-types'

export {
  SOURCE_TYPES,
  SYNC_STATUSES,
  SOURCE_TYPE_DISPLAY_NAMES,
  SOURCE_TYPE_DESCRIPTIONS,
  SOURCE_TYPE_ICONS,
  SYNC_STATUS_DISPLAY_NAMES,
  SYNC_STATUS_COLORS,
  sourceNeedsSync,
  formatSyncTime,
  getSourceDisplayUrl,
} from './template-source-types'

// ============================================
// SECRET STORE HOOKS & TYPES
// ============================================

export {
  // Secret store hooks
  useSecretStoreCredentials,
  useSecretStoreCredential,
  useCreateSecretStoreCredential,
  useUpdateSecretStoreCredential,
  useDeleteSecretStoreCredential,

  // Cache utilities
  secretStoreKeys,
  invalidateSecretStoreCache,
  secretStoreEndpoints,
} from './secret-store-hooks'

export type {
  SecretStoreCredential,
  CredentialType,
  APIKeyData,
  BasicAuthData,
  BearerTokenData,
  SSHKeyData,
  AWSRoleData,
  GCPServiceAccountData,
  AzureServicePrincipalData,
  GitHubAppData,
  GitLabTokenData,
  CreateSecretStoreCredentialRequest,
  UpdateSecretStoreCredentialRequest,
  SecretStoreCredentialListFilters,
  SecretStoreCredentialListResponse,
} from './secret-store-types'

export {
  CREDENTIAL_TYPES,
  CREDENTIAL_TYPE_DISPLAY_NAMES,
  CREDENTIAL_TYPE_DESCRIPTIONS,
  CREDENTIAL_TYPE_ICONS,
  isCredentialExpired,
  isCredentialExpiringSoon,
  formatLastUsed,
} from './secret-store-types'

// ============================================
// PLATFORM AGENT HOOKS & TYPES
// ============================================

export {
  // Platform hooks
  usePlatformStats,
  usePlatformAgents,
  usePlatformUsage,

  // Cache utilities
  platformKeys,
  invalidatePlatformCache,
  invalidatePlatformStatsCache,
} from './platform-hooks'

export type {
  PlatformAgentTier,
  TierStats,
  PlatformStatsResponse,
  PlatformAgent,
  PlatformAgentListFilters,
  PlatformAgentListResponse,
} from './platform-types'

export {
  PLATFORM_AGENT_TIERS,
  PLATFORM_TIER_LABELS,
  PLATFORM_TIER_DESCRIPTIONS,
  PLATFORM_TIER_COLORS,
  PLATFORM_TIER_BG_COLORS,
  PLATFORM_TIER_BORDER_COLORS,
  PLATFORM_TIER_ICONS,
  getTierPriority,
  isTierAccessible,
  getAccessibleTiers,
} from './platform-types'

// ============================================
// PLATFORM ENDPOINTS
// ============================================

export { platformEndpoints } from './endpoints'
