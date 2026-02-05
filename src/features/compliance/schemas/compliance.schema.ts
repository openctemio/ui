import { z } from "zod";

export const complianceFrameworkSchema = z.enum([
  "pci_dss",
  "soc2",
  "iso_27001",
  "gdpr",
  "hipaa",
  "nist",
  "cis",
]);

export const controlStatusSchema = z.enum([
  "implemented",
  "partial",
  "not_implemented",
  "not_applicable",
]);

export const prioritySchema = z.enum(["critical", "high", "medium", "low"]);

export const createRequirementSchema = z.object({
  framework: complianceFrameworkSchema,
  controlId: z.string().min(1, "Control ID is required"),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  category: z.string().min(1, "Category is required"),
  status: controlStatusSchema,
  priority: prioritySchema,
  owner: z.string().min(1, "Owner is required"),
  dueDate: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const updateRequirementSchema = createRequirementSchema.partial();
