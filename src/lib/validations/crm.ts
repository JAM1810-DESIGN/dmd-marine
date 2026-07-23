import { z } from "zod";

export const companySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().optional(),
  notes: z.string().optional(),
});

export type CompanyInput = z.infer<typeof companySchema>;

export const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  companyId: z
    .string()
    .optional()
    .transform((value) => (value && value !== "none" ? value : null)),
  notes: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const vesselSchema = z.object({
  name: z.string().min(1, "Vessel name is required"),
  imoNumber: z.string().optional(),
  type: z.string().optional(),
  flag: z.string().optional(),
});

export type VesselInput = z.infer<typeof vesselSchema>;

export const contactHistorySchema = z.object({
  type: z.enum(["CALL", "EMAIL", "MEETING", "SITE_VISIT", "NOTE", "OTHER"]),
  summary: z.string().min(1, "Summary is required"),
  occurredAt: z.string().optional(),
});

export type ContactHistoryInput = z.infer<typeof contactHistorySchema>;
