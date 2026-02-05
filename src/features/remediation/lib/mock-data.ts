/**
 * Remediation Mock Data
 *
 * Remediation tasks for development and testing
 */

import type { RemediationTask } from "../types";

// Helper to generate dates
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export const mockRemediationTasks: RemediationTask[] = [
  {
    id: "task-001",
    title: "Patch SQL Injection vulnerability in login form",
    description:
      "Implement prepared statements and parameterized queries to fix SQL injection in ebanking login form",
    status: "in_progress",
    priority: "urgent",
    findingId: "fnd-001",
    findingTitle: "SQL Injection in Login Form",
    severity: "critical",
    assetId: "web-002",
    assetName: "ebanking.techcombank.com.vn",
    assigneeId: "usr-001",
    assigneeName: "Nguyen Van An",
    dueDate: daysAgo(-5),
    estimatedHours: 16,
    actualHours: 12,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(1),
  },
  {
    id: "task-002",
    title: "Remove hardcoded AWS credentials from repository",
    description:
      "Rotate compromised credentials, remove from source code, implement secrets manager",
    status: "open",
    priority: "urgent",
    findingId: "fnd-003",
    findingTitle: "Hardcoded AWS Credentials in Source Code",
    severity: "critical",
    assetId: "repo-003",
    assetName: "viettel/infrastructure-terraform",
    assigneeId: "usr-003",
    assigneeName: "Le Van Cuong",
    dueDate: daysAgo(-1),
    estimatedHours: 8,
    createdAt: daysAgo(8),
    updatedAt: daysAgo(0),
  },
  {
    id: "task-003",
    title: "Fix file upload RCE vulnerability",
    description:
      "Implement file type validation, content inspection, and secure storage for vinmart uploads",
    status: "in_progress",
    priority: "high",
    findingId: "fnd-002",
    findingTitle: "Remote Code Execution via File Upload",
    severity: "critical",
    assetId: "web-003",
    assetName: "shop.vinmart.vn",
    assigneeId: "usr-002",
    assigneeName: "Tran Thi Binh",
    dueDate: daysAgo(-3),
    estimatedHours: 24,
    actualHours: 18,
    createdAt: daysAgo(12),
    updatedAt: daysAgo(0),
  },
  {
    id: "task-004",
    title: "Implement rate limiting on MoMo API",
    description:
      "Add rate limiting middleware to prevent brute force attacks on API endpoints",
    status: "open",
    priority: "high",
    findingId: "fnd-007",
    findingTitle: "Missing Rate Limiting on API",
    severity: "high",
    assetId: "web-004",
    assetName: "api.momo.vn",
    assigneeId: "usr-003",
    assigneeName: "Le Van Cuong",
    dueDate: daysAgo(10),
    estimatedHours: 12,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(5),
  },
  {
    id: "task-005",
    title: "Secure Kubernetes dashboard access",
    description:
      "Configure RBAC, restrict public access, implement VPN requirement for k8s dashboard",
    status: "in_progress",
    priority: "high",
    findingId: "fnd-009",
    findingTitle: "Exposed Kubernetes Dashboard",
    severity: "high",
    assetId: "cloud-002",
    assetName: "gcp-prod-gke-cluster",
    assigneeId: "usr-003",
    assigneeName: "Le Van Cuong",
    dueDate: daysAgo(3),
    estimatedHours: 8,
    actualHours: 4,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
  },
  {
    id: "task-006",
    title: "Add security headers to e-commerce site",
    description:
      "Implement CSP, X-Frame-Options, X-Content-Type-Options, and other security headers",
    status: "review",
    priority: "medium",
    findingId: "fnd-013",
    findingTitle: "Missing Security Headers",
    severity: "medium",
    assetId: "web-003",
    assetName: "shop.vinmart.vn",
    assigneeId: "usr-001",
    assigneeName: "Nguyen Van An",
    dueDate: daysAgo(14),
    estimatedHours: 4,
    actualHours: 3,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
  },
  {
    id: "task-007",
    title: "Restrict Redis port access",
    description:
      "Configure firewall rules to restrict Redis port 6379 access from public internet",
    status: "open",
    priority: "medium",
    findingId: "fnd-017",
    findingTitle: "Open Redis Port to Internet",
    severity: "medium",
    assetId: "svc-003",
    assetName: "Redis - cache.internal.vn:6379",
    assigneeId: "usr-003",
    assigneeName: "Le Van Cuong",
    dueDate: daysAgo(7),
    estimatedHours: 2,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(4),
  },
  {
    id: "task-008",
    title: "Update vulnerable npm dependencies",
    description:
      "Update outdated npm packages with known CVEs in ecommerce frontend project",
    status: "blocked",
    priority: "medium",
    findingId: "fnd-019",
    findingTitle: "Outdated Dependencies with Known Vulnerabilities",
    severity: "medium",
    assetId: "repo-002",
    assetName: "fpt/ecommerce-frontend",
    assigneeId: "usr-001",
    assigneeName: "Nguyen Van An",
    dueDate: daysAgo(21),
    estimatedHours: 8,
    createdAt: daysAgo(35),
    updatedAt: daysAgo(10),
  },
];

// Stats
export const getTaskStats = () => {
  const byStatus = {
    open: mockRemediationTasks.filter((t) => t.status === "open").length,
    in_progress: mockRemediationTasks.filter((t) => t.status === "in_progress")
      .length,
    review: mockRemediationTasks.filter((t) => t.status === "review").length,
    completed: mockRemediationTasks.filter((t) => t.status === "completed")
      .length,
    blocked: mockRemediationTasks.filter((t) => t.status === "blocked").length,
  };

  const byPriority = {
    urgent: mockRemediationTasks.filter((t) => t.priority === "urgent").length,
    high: mockRemediationTasks.filter((t) => t.priority === "high").length,
    medium: mockRemediationTasks.filter((t) => t.priority === "medium").length,
    low: mockRemediationTasks.filter((t) => t.priority === "low").length,
  };

  const now = new Date();
  const overdue = mockRemediationTasks.filter(
    (t) => new Date(t.dueDate) < now && t.status !== "completed"
  ).length;

  return {
    total: mockRemediationTasks.length,
    byStatus,
    byPriority,
    overdue,
    completedThisWeek: mockRemediationTasks.filter(
      (t) =>
        t.completedAt &&
        new Date(t.completedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length,
    averageCompletionTime: 12, // mock value
  };
};

// Tasks by status for Kanban
export const getTasksByStatus = () => ({
  open: mockRemediationTasks.filter((t) => t.status === "open"),
  in_progress: mockRemediationTasks.filter((t) => t.status === "in_progress"),
  review: mockRemediationTasks.filter((t) => t.status === "review"),
  completed: mockRemediationTasks.filter((t) => t.status === "completed"),
  blocked: mockRemediationTasks.filter((t) => t.status === "blocked"),
});
