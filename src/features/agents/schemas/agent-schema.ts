import { z } from 'zod';

// Agent type options (CTEM framework)
// runner = CI/CD one-shot, worker = daemon, collector = asset discovery, sensor = EASM
export const AGENT_TYPE_OPTIONS = [
    { value: 'runner', label: 'Runner', description: 'CI/CD pipeline runner (one-shot execution)' },
    { value: 'worker', label: 'Worker', description: 'Long-running daemon worker' },
    { value: 'collector', label: 'Collector', description: 'Asset discovery collector' },
    { value: 'sensor', label: 'Sensor', description: 'EASM external sensor' },
] as const;

// Agent status options (admin-controlled)
export const AGENT_STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'disabled', label: 'Disabled' },
    { value: 'revoked', label: 'Revoked' },
] as const;

// Agent health options (heartbeat-based, automatic)
export const AGENT_HEALTH_OPTIONS = [
    { value: 'unknown', label: 'Unknown' },
    { value: 'online', label: 'Online' },
    { value: 'offline', label: 'Offline' },
    { value: 'error', label: 'Error' },
] as const;

// Execution mode options
export const AGENT_EXECUTION_MODE_OPTIONS = [
    { value: 'standalone', label: 'Standalone' },
    { value: 'daemon', label: 'Daemon' },
] as const;

// Note: Capability and Tool options are now dynamically loaded from the API
// See: useAgentFormOptions hook in ../hooks/use-agent-form-options.ts

// Enum schemas
export const agentTypeSchema = z.enum(['runner', 'worker', 'collector', 'sensor']);
export const agentStatusSchema = z.enum(['active', 'disabled', 'revoked']);
export const agentHealthSchema = z.enum(['unknown', 'online', 'offline', 'error']);
export const executionModeSchema = z.enum(['standalone', 'daemon']);

// Create agent form data type (for form)
export interface CreateAgentFormData {
    name: string;
    type: 'runner' | 'worker' | 'collector' | 'sensor';
    description?: string;
    capabilities: string[];
    tools: string[];
    execution_mode: 'standalone' | 'daemon';
    labels?: Record<string, string>;
}

// Create agent schema
export const createAgentSchema = z.object({
    name: z
        .string()
        .min(1, 'Name is required')
        .max(255, 'Name must be less than 255 characters'),
    type: agentTypeSchema,
    description: z.string().max(1000).optional(),
    capabilities: z.array(z.string()),
    tools: z.array(z.string()),
    execution_mode: executionModeSchema,
    labels: z.record(z.string(), z.string()).optional(),
});

// Update agent form data type (for form)
export interface UpdateAgentFormData {
    name?: string;
    description?: string;
    capabilities?: string[];
    tools?: string[];
    execution_mode?: 'standalone' | 'daemon';
    status?: 'active' | 'disabled' | 'revoked';
    labels?: Record<string, string>;
}

// Update agent schema
export const updateAgentSchema = z.object({
    name: z
        .string()
        .min(1, 'Name is required')
        .max(255, 'Name must be less than 255 characters')
        .optional(),
    description: z.string().max(1000).optional(),
    capabilities: z.array(z.string()).optional(),
    tools: z.array(z.string()).optional(),
    execution_mode: executionModeSchema.optional(),
    status: agentStatusSchema.optional(),
    labels: z.record(z.string(), z.string()).optional(),
});
