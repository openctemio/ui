/**
 * Named access to the generated OpenAPI types.
 *
 * `api.types.ts` is machine-generated and keys its schemas by Go package path
 * (`internal_infra_http_handler.FindingResponse`). Feature code should not
 * reach into that: the key changes whenever a handler type moves package, and
 * the resulting error points at the UI rather than at the rename.
 *
 * This module is a naming layer ONLY. It declares no field shapes — every
 * export resolves to a generated type. If a field is wrong here it is wrong in
 * the server's annotations, which is the point.
 */
import type { paths, components } from './api.types'

export type { paths, components } from './api.types'

/** All schemas the API declares, keyed by their generated (Go) name. */
export type Schemas = components['schemas']

/**
 * The JSON body of an operation's success response.
 *
 * Many list endpoints declare their envelope inline rather than as a named
 * schema, so there is nothing to alias — this reaches the shape through the
 * path + method instead.
 *
 * @example type AssetTypeList = ApiResponse<'/asset-types', 'get'>
 */
export type ApiResponse<P extends keyof paths, M extends keyof paths[P]> = paths[P][M] extends {
  responses: { 200: { content: { 'application/json': infer R } } }
}
  ? R
  : paths[P][M] extends {
        responses: { 201: { content: { 'application/json': infer R } } }
      }
    ? R
    : never

/** The JSON request body an operation accepts. */
export type ApiRequestBody<P extends keyof paths, M extends keyof paths[P]> = paths[P][M] extends {
  requestBody: { content: { 'application/json': infer B } }
}
  ? B
  : paths[P][M] extends {
        requestBody?: { content: { 'application/json': infer B } }
      }
    ? B
    : never

/** The query parameters an operation accepts. */
export type ApiQuery<P extends keyof paths, M extends keyof paths[P]> = paths[P][M] extends {
  parameters: { query?: infer Q }
}
  ? Q
  : never

// ---------------------------------------------------------------------------
// Aliases for the schemas the UI consumes today.
//
// Only endpoints the server actually documents appear here. The spec covers 377
// of 834 registered routes, so a feature missing from this list is missing
// because nothing on the server side describes it yet — not because it was
// skipped. See the PR description for the list.
// ---------------------------------------------------------------------------

// Errors
export type ApiError = Schemas['github_com_openctemio_api_pkg_apierror.Error']

// Asset types
export type AssetTypeResponse = Schemas['internal_infra_http_handler.AssetTypeResponse']
export type AssetTypeCategoryResponse = Schemas['internal_infra_http_handler.CategoryResponse']

// Asset groups
export type AssetGroupResponse = Schemas['internal_infra_http_handler.AssetGroupResponse']
export type AssetGroupStatsResponse = Schemas['internal_infra_http_handler.AssetGroupStatsResponse']
export type GroupAssetResponse = Schemas['internal_infra_http_handler.GroupAssetResponse']
export type GroupFindingResponse = Schemas['internal_infra_http_handler.GroupFindingResponse']

// Components (SBOM)
export type ComponentResponse = Schemas['internal_infra_http_handler.ComponentResponse']
export type ComponentStats =
  Schemas['github_com_openctemio_api_pkg_domain_component.ComponentStats']
export type EcosystemStats =
  Schemas['github_com_openctemio_api_pkg_domain_component.EcosystemStats']
export type LicenseStats = Schemas['github_com_openctemio_api_pkg_domain_component.LicenseStats']
export type VulnerableComponent =
  Schemas['github_com_openctemio_api_pkg_domain_component.VulnerableComponent']

// Credentials (leaked-credential inventory)
export type CredentialItem = Schemas['github_com_openctemio_api_internal_app.CredentialItem']
export type CredentialListResult =
  Schemas['github_com_openctemio_api_internal_app.CredentialListResult']
export type IdentityListResult =
  Schemas['github_com_openctemio_api_internal_app.IdentityListResult']
export type IdentityExposure =
  Schemas['github_com_openctemio_api_internal_app_integration.IdentityExposure']
export type CredentialImportResult =
  Schemas['github_com_openctemio_api_pkg_domain_credential.ImportResult']

// Findings / vulnerabilities.
//
// Named but NOT yet consumed. src/features/findings/api/finding-api.types.ts is
// still hand-written, deliberately: ApiFinding has 124 fields against
// FindingResponse's 139, it is read by dozens of components, and switching it
// is a large enough change to deserve its own review. The 15 fields it is
// missing are listed in the PR description — they include sla_deadline,
// is_internet_accessible, remediation and cisa_kev.
export type FindingResponse = Schemas['internal_infra_http_handler.FindingResponse']
export type FindingStatsResponse = Schemas['internal_infra_http_handler.FindingStatsResponse']
export type VulnerabilityResponse = Schemas['internal_infra_http_handler.VulnerabilityResponse']
export type DataFlowResponse = Schemas['internal_infra_http_handler.DataFlowResponse']
export type BulkUpdateResponse = Schemas['internal_infra_http_handler.BulkUpdateResponse']

// Scope (targets / exclusions / schedules)
export type ScopeTargetResponse = Schemas['internal_infra_http_handler.ScopeTargetResponse']
export type ScopeExclusionResponse = Schemas['internal_infra_http_handler.ScopeExclusionResponse']
export type ScanScheduleResponse = Schemas['internal_infra_http_handler.ScanScheduleResponse']
export type ScopeStatsResponse = Schemas['internal_infra_http_handler.ScopeStatsResponse']
export type ScopeMatchResponse = Schemas['internal_infra_http_handler.ScopeMatchResponse']
export type ScopeBulkOperationResponse =
  Schemas['internal_infra_http_handler.ScopeBulkOperationResponse']
