import { z } from "zod";
import { CONSULTANT_RANKS } from "@/lib/consultant-ranks";

const rankField = z
  .string()
  .optional()
  .transform((value) => (value && value !== "none" ? value : null))
  .refine((value) => value === null || (CONSULTANT_RANKS as readonly string[]).includes(value), {
    message: "Please select a valid rank.",
  });

export const createConsultantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rank: rankField,
  vesselExperience: z.string().optional().transform((value) => value || null),
  phone: z.string().optional().transform((value) => value || null),
});

export const updateConsultantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  rank: rankField,
  vesselExperience: z.string().optional().transform((value) => value || null),
  phone: z.string().optional().transform((value) => value || null),
});

export type CreateConsultantInput = z.infer<typeof createConsultantSchema>;
export type UpdateConsultantInput = z.infer<typeof updateConsultantSchema>;
