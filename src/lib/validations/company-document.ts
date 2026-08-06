import { z } from "zod";

export const companyDocumentSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  category: z.enum(["DOCUMENT", "FORM"]),
  description: z.string().optional().transform((value) => value || null),
});

export type CompanyDocumentInput = z.infer<typeof companyDocumentSchema>;
