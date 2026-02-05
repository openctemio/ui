import { z } from "zod";

export const businessUnitStatusSchema = z.enum(["active", "inactive", "archived"]);
export const riskToleranceSchema = z.enum(["very_low", "low", "medium", "high", "very_high"]);
export const criticalitySchema = z.enum(["critical", "high", "medium", "low"]);

export const createBusinessUnitSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  parentId: z.string().optional(),
  criticality: criticalitySchema,
  riskTolerance: riskToleranceSchema,
  owner: z.string().min(1, "Owner is required"),
  ownerEmail: z.string().email("Invalid email address"),
  tags: z.array(z.string()).optional(),
});

export const updateBusinessUnitSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  parentId: z.string().nullable().optional(),
  status: businessUnitStatusSchema.optional(),
  criticality: criticalitySchema.optional(),
  riskTolerance: riskToleranceSchema.optional(),
  owner: z.string().min(1, "Owner is required").optional(),
  ownerEmail: z.string().email("Invalid email address").optional(),
  tags: z.array(z.string()).optional(),
});
