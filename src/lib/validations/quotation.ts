import { z } from "zod";

export const quotationItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0, "Qty can't be negative").default(1),
  unitPrice: z.coerce.number().min(0, "Rate can't be negative").default(0),
});

export const quotationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  billTo: z.string().min(1, "Bill-to is required"),
  attention: z.string().optional(),
  vesselName: z.string().optional(),
  location: z.string().optional(),
  currency: z.string().min(1).default("USD"),
  quoteDate: z.string().min(1, "Date is required"),
  validityDays: z.coerce.number().int().min(0).default(30),
  paymentTerms: z.string().optional(),
  conditions: z.string().optional(),
  scope: z.array(z.string()).default([]),
  notes: z.string().optional(),
  taxRatePercent: z.coerce.number().min(0).max(100).default(0),
  customerId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "none" ? v : null)),
  items: z.array(quotationItemSchema).min(1, "Add at least one line item"),
});

export type QuotationInput = z.infer<typeof quotationSchema>;
export type QuotationItemInput = z.infer<typeof quotationItemSchema>;
