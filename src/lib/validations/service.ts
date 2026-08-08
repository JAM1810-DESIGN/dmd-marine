import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  order: z.coerce.number().int().default(0),
});

export type CategoryInput = z.infer<typeof categorySchema>;

const faqItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const basePriceField = z
  .string()
  .optional()
  .transform((value) => (value && value.trim() !== "" ? Number(value) : null))
  .refine((value) => value === null || (Number.isFinite(value) && value >= 0), {
    message: "Enter a valid price (0 or more).",
  });

export const serviceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  categoryId: z.string().min(1, "Please select a category"),
  parentServiceId: z
    .string()
    .optional()
    .transform((value) => (value && value !== "none" ? value : null)),
  overview: z.string().optional(),
  benefits: z.string().optional(),
  scope: z.string().optional(),
  process: z.string().optional(),
  // The form always submits the full desired state, so "none"/empty always
  // means "clear the consultant" (null), never "leave unchanged".
  defaultConsultantId: z
    .string()
    .optional()
    .transform((value) => (value && value !== "none" ? value : null)),
  order: z.coerce.number().int().default(0),
  basePrice: basePriceField,
  priceUnit: z
    .string()
    .optional()
    .transform((value) => (value && value !== "none" ? value : null)),
  faq: z.array(faqItemSchema).default([]),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
