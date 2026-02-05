import { z } from "zod";

export const assetCategorySchema = z.enum([
  "data",
  "system",
  "application",
  "infrastructure",
  "intellectual_property",
  "financial",
]);

export const protectionLevelSchema = z.enum(["maximum", "high", "standard", "basic"]);
export const dataClassificationSchema = z.enum(["top_secret", "confidential", "internal", "public"]);
export const jewelStatusSchema = z.enum(["protected", "at_risk", "exposed", "under_review"]);

export const createCrownJewelSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  category: assetCategorySchema,
  protectionLevel: protectionLevelSchema,
  dataClassification: dataClassificationSchema,
  businessImpact: z.string().min(1, "Business impact is required"),
  owner: z.string().min(1, "Owner is required"),
  ownerEmail: z.string().email("Invalid email address"),
  businessUnit: z.string().min(1, "Business unit is required"),
  tags: z.array(z.string()).optional(),
});

export const updateCrownJewelSchema = createCrownJewelSchema.partial();
