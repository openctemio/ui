# Agents Management UI Guide

> **Last Updated**: January 27, 2026
> **Status**: Production Ready

## Overview

The Agents UI provides a comprehensive interface for managing distributed agents that execute security scans. Agents are deployed on tenant infrastructure that poll for commands and execute scanning tasks.

## Component Architecture

```
Agents Page
├── AgentsSection (main container)
│   ├── Stats Cards (total, online, offline, error, active jobs)
│   ├── Filter Tabs (All, Daemon, CI/CD, Collectors, Sensors)
│   ├── Search Input
│   ├── Bulk Actions Dropdown
│   └── AgentTable
│       └── Table rows with actions
│
├── Dialogs
│   ├── AddAgentDialog (create new agent)
│   ├── EditAgentDialog (update existing)
│   ├── RegenerateKeyDialog (regenerate API key)
│   ├── AgentConfigDialog (view config templates)
│   ├── RevokeConfirmationDialog (permanent revoke confirmation)
│   └── AlertDialog (delete confirmation)
│
└── AgentDetailSheet (side panel)
    ├── Overview Tab (stats, tools, labels)
    ├── Capabilities Tab (capabilities list, API key)
    ├── Activity Tab (audit log history)
    └── Details Tab (metadata, danger zone)
```

## File Structure

```
ui/src/features/agents/
├── components/
│   ├── agents-section.tsx        # Main container component
│   ├── agent-table.tsx           # Data table with monitoring
│   ├── add-agent-dialog.tsx      # Create agent form
│   ├── edit-agent-dialog.tsx     # Edit agent form
│   ├── regenerate-key-dialog.tsx # API key regeneration
│   ├── agent-config-dialog.tsx   # Config template viewer
│   ├── agent-detail-sheet.tsx    # Detail side panel with tabs
│   ├── agent-audit-log.tsx       # Audit log component
│   ├── agent-stats-cards.tsx     # Stats cards component
│   ├── agent-type-icon.tsx       # Icon/label utilities
│   └── index.ts                  # Barrel exports
├── schemas/
│   └── agent-schema.ts           # Zod validation schemas
├── hooks/
│   └── use-agent-form-options.ts # Dynamic form options
└── index.ts                      # Feature barrel export
```

## API Integration

### Hooks (`lib/api/agent-hooks.ts`)

```typescript
// Data fetching
useAgents(filters?)        // List agents with optional filters
useAgent(agentId)          // Get single agent

// Mutations
useCreateAgent()           // Create new agent
useUpdateAgent(id)         // Update agent
useDeleteAgent(id)         // Delete single agent
useBulkDeleteAgents()      // Delete multiple agents
useRegenerateAgentKey(id)  // Regenerate API key
useActivateAgent(id)       // Set status to active
useDeactivateAgent(id)     // Set status to disabled
useRevokeAgent(id)         // Permanently revoke access

// Cache utilities
invalidateAgentsCache()    // Refresh all agents data
```

### Audit Log Hooks (`lib/api/audit-hooks.ts`)

```typescript
// Data fetching
useAuditLogs(filters?)                    // List audit logs
useAuditLog(logId)                        // Get single audit log
useAuditLogStats()                        // Get audit statistics
useResourceAuditHistory(type, id)         // Get history for a resource
useUserAuditActivity(userId)              // Get user activity

// Cache utilities
invalidateAuditLogsCache()                // Refresh audit logs
```

### API Endpoints

```
# Agent Management
GET    /api/v1/agents                     # List agents
GET    /api/v1/agents/{id}                # Get agent
POST   /api/v1/agents                     # Create agent
PUT    /api/v1/agents/{id}                # Update agent
DELETE /api/v1/agents/{id}                # Delete agent
POST   /api/v1/agents/{id}/regenerate-key # Regenerate API key
POST   /api/v1/agents/{id}/activate       # Activate agent
POST   /api/v1/agents/{id}/deactivate     # Deactivate agent
POST   /api/v1/agents/{id}/revoke         # Revoke agent (permanent)

# Audit Logs
GET    /api/v1/audit-logs                 # List audit logs
GET    /api/v1/audit-logs/{id}            # Get audit log
GET    /api/v1/audit-logs/stats           # Get statistics
GET    /api/v1/audit-logs/resource/{type}/{id}  # Resource history
GET    /api/v1/audit-logs/user/{id}       # User activity
```

## Agent Types

| Type        | Description    | Use Case                           |
| ----------- | -------------- | ---------------------------------- |
| `runner`    | CI/CD runner   | One-shot scans in pipelines        |
| `worker`    | Daemon worker  | Continuous polling, long-running   |
| `collector` | Data collector | Asset discovery, inventory         |
| `sensor`    | EASM sensor    | External attack surface monitoring |

## Agent Status (Dual-State Architecture)

### Admin-Controlled Status

| Status     | Description                   | Actions                       |
| ---------- | ----------------------------- | ----------------------------- |
| `active`   | Agent is enabled              | Can be deactivated or revoked |
| `disabled` | Agent is temporarily disabled | Can be reactivated            |
| `revoked`  | Agent is permanently revoked  | Cannot be undone              |

### Heartbeat-Based Health

| Health    | Description                | Indicator    |
| --------- | -------------------------- | ------------ |
| `online`  | Recent heartbeat (< 5 min) | Green badge  |
| `offline` | No recent heartbeat        | Gray badge   |
| `error`   | Agent reporting errors     | Red badge    |
| `unknown` | No heartbeat data          | Yellow badge |

## Execution Modes

| Mode         | Description                           |
| ------------ | ------------------------------------- |
| `daemon`     | Runs continuously, polls for commands |
| `standalone` | One-shot execution (CI/CD pipelines)  |

## UI Features

### Stats Cards

Displays real-time statistics:

- **Total Agents**: Count of all agents
- **Online**: Agents with active heartbeat (< 5 minutes)
- **Offline**: Agents without recent heartbeat
- **Error**: Agents in error state
- **Active Jobs**: Currently running commands (daemon agents)

### Filter Tabs

- **All Agents**: Show all agents
- **Daemon**: Filter by `execution_mode = 'daemon'`
- **CI/CD**: Filter by `execution_mode = 'standalone'`
- **Collectors**: Filter by `type = 'collector'`
- **Sensors**: Filter by `type = 'sensor'`

### Search

Client-side filtering by:

- Agent name
- Description
- Hostname
- IP address

### Bulk Actions

Select multiple agents for batch operations:

- Bulk delete with confirmation dialog
- Selection persists across page changes

### Agent Table Columns

| Column        | Description                                             |
| ------------- | ------------------------------------------------------- |
| Agent         | Name, hostname, icon                                    |
| Type          | runner, worker, collector, sensor (with colored badges) |
| Status/Health | Combined status/health indicator                        |
| Active Jobs   | Current command count with lightning icon               |
| CPU           | Usage percentage with progress bar                      |
| Memory        | Usage percentage with progress bar                      |
| Version       | Agent version                                           |
| Region        | Deployment region                                       |
| Actions       | Dropdown menu                                           |

### Row Actions

- **View Details**: Open detail sheet
- **Edit**: Open edit dialog
- **View Config**: Show configuration templates
- **Regenerate Key**: Generate new API key
- **Activate/Deactivate**: Toggle agent status
- **Revoke**: Permanently revoke access (with confirmation)
- **Delete**: Remove agent

### Revoke Confirmation Dialog

The revoke action shows a confirmation dialog with:

- Warning about permanent action
- Option to deactivate instead (temporary suspension)
- Clear explanation of consequences

## Agent Detail Sheet

The detail sheet has four tabs:

### Overview Tab

- Statistics (Total Scans, Findings, Errors)
- Tools list
- Labels
- Status message (if any)

### Capabilities Tab

- Capabilities grid
- API key info with regenerate button

### Activity Tab (NEW)

- Audit log history for the agent
- Shows all actions: created, updated, activated, deactivated, revoked, key regenerated
- Displays actor (who performed the action), timestamp, result
- Shows before/after changes for updates
- Auto-refreshes every 30 seconds

### Details Tab

- Agent information (type, mode, version, hostname, IP)
- Danger zone (Revoke, Delete)

## Audit Log Feature

### Audit Actions Tracked

| Action                  | Severity | Description                      |
| ----------------------- | -------- | -------------------------------- |
| `agent.created`         | Medium   | Agent was created                |
| `agent.updated`         | Low      | Agent settings updated           |
| `agent.deleted`         | Critical | Agent was deleted                |
| `agent.activated`       | Medium   | Agent was activated              |
| `agent.deactivated`     | High     | Agent was deactivated            |
| `agent.revoked`         | Critical | Agent access permanently revoked |
| `agent.key_regenerated` | High     | API key was regenerated          |
| `agent.connected`       | Low      | Agent connected (heartbeat)      |
| `agent.disconnected`    | Low      | Agent disconnected               |

### Audit Log Entry Format

```typescript
interface AuditLog {
  id: string
  tenant_id?: string
  actor_id?: string
  actor_email: string
  actor_ip?: string
  action: AuditAction
  resource_type: 'agent'
  resource_id: string
  resource_name?: string
  changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> }
  result: 'success' | 'failure' | 'denied'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  metadata?: Record<string, unknown>
  request_id?: string
  timestamp: string
}
```

## Add Agent Flow

```
1. Click "Add Agent" button
2. Fill form:
   - Type (required): Runner, Worker, Collector, Sensor
   - Name (required): Display name
   - Description (optional): Purpose description
   - Execution Mode: Standalone or Daemon
   - Capabilities: Security capabilities (SAST, SCA, etc.)
   - Tools: Security tools (Semgrep, Trivy, etc.)
3. Submit form
4. Success dialog shows:
   - New API key (one-time display)
   - Copy button
   - View Config button
5. Close dialog to refresh list
```

## Config Templates

Agent configuration templates for different deployment methods:

### YAML Config

```yaml
agent:
  name: Agent Name
  region: ap-southeast-1
  enable_commands: true
  command_poll_interval: 30s
  heartbeat_interval: 1m

server:
  base_url: http://api.example.com:8080
  api_key: <YOUR_API_KEY>
  agent_id: <AGENT_UUID>

scanners:
  - name: semgrep
    enabled: true
```

### Environment Variables

```bash
export API_URL=http://api.example.com:8080
export API_KEY=<YOUR_API_KEY>
export AGENT_ID=<AGENT_UUID>
export REGION=ap-southeast-1
```

### Docker Command

```bash
docker run -d \
  --name agent-name \
  -v /path/to/scan:/code:ro \
  -e API_URL=http://api.example.com:8080 \
  -e API_KEY=<YOUR_API_KEY> \
  -e AGENT_ID=<AGENT_UUID> \
  -e REGION=ap-southeast-1 \
  exploopio/agent:latest \
  -daemon -config /app/agent.yaml
```

### CLI Commands

```bash
# One-shot scan
./agent -tool semgrep -target /path/to/project -push

# Daemon mode
./agent -daemon -config agent.yaml
```

## Error Handling

### Form Validation

Uses Zod schemas for validation:

```typescript
export const createAgentSchema = z.object({
  type: z.enum(['runner', 'worker', 'collector', 'sensor']),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  execution_mode: z.enum(['standalone', 'daemon']),
  capabilities: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
})
```

### API Errors

Handled by SWR with automatic retry:

- 4xx errors: No retry (client errors)
- 5xx errors: Retry up to 3 times
- Toast notifications for user feedback

## Best Practices

### 1. Cache Invalidation

Always invalidate cache after mutations:

```typescript
await deleteAgent()
await invalidateAgentsCache()
```

### 2. Optimistic Updates

For immediate UI feedback, use SWR's mutate:

```typescript
mutate(newData, false)
```

### 3. Error Boundaries

Wrap sections with error handling:

```typescript
if (error) {
  return <ErrorDisplay error={error} onRetry={handleRefresh} />;
}
```

### 4. Loading States

Show skeletons during loading:

```typescript
if (isLoading) {
  return <AgentTableSkeleton />;
}
```

## Troubleshooting

### Agent Shows Offline

1. Check heartbeat interval (should be < 5 minutes)
2. Verify API key is correct
3. Check network connectivity
4. Review agent logs

### API Key Not Showing

API keys are only displayed once after creation/regeneration.
If lost, regenerate a new key.

### Audit Logs Not Loading

1. Check `/api/v1/audit-logs` endpoint is accessible
2. Verify tenant context is set
3. Check browser console for errors

### Revoked Agent Cannot Be Restored

Revoke is permanent by design. To restore access:

1. Create a new agent with the same configuration
2. Update the agent with the new API key

## SDK Security Events in Activity Tab

The Activity tab displays security-related events from SDK agents:

| Event                   | Description                               |
| ----------------------- | ----------------------------------------- |
| `agent.key_regenerated` | API key was regenerated                   |
| `agent.revoked`         | Agent access permanently revoked          |
| `job.validation_failed` | Job rejected (type/size/token validation) |
| `lease.expired`         | Agent's lease expired, jobs canceled      |

> **Note**: SDK v1.1+ includes credential encryption, job validation, and lease security features.
> See [SDK Security Guide](../../sdk/docs/SECURITY.md) for details.

## Related Documentation

- [Scan Orchestration](../api/docs/architecture/scan-orchestration.md)
- [Architecture Overview](../api/docs/architecture/overview.md)
- [Agent Key Management](../../docs/architecture/agent-key-management.md)
- [SDK Security Guide](../../sdk/docs/SECURITY.md)
- [API Patterns](patterns.md)
