/**
 * Remediation Types
 *
 * Type definitions for remediation tasks and workflows
 */

import type { Severity } from "@/features/shared/types";

export type TaskStatus =
  | "open"
  | "in_progress"
  | "review"
  | "completed"
  | "blocked";

export type TaskPriority = "urgent" | "high" | "medium" | "low";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  review: "In Review",
  completed: "Completed",
  blocked: "Blocked",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/**
 * Remediation task
 */
export interface RemediationTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  findingId: string;
  findingTitle: string;
  severity: Severity;
  assetId?: string;
  assetName?: string;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar?: string;
  dueDate: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Task statistics
 */
export interface TaskStats {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  overdue: number;
  completedThisWeek: number;
  averageCompletionTime: number; // in hours
}
