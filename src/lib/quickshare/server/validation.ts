import { z } from "zod";

export const quickShareHandleSchema = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Use lowercase letters, numbers, and hyphens.")
  .refine((value) => !["api", "assets", "releases", "system", "www"].includes(value), "This handle is reserved.");

export const quickShareCustomIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Use lowercase letters, numbers, and hyphens.")
  .refine((value) => !["api", "assets", "releases", "_system"].includes(value), "This identifier is reserved.");

export const normalizeQuickShareHandle = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "-");

export const normalizeQuickShareCustomId = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "-");
