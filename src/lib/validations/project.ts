import { z } from "zod";

function noneToNull(value: string | undefined) {
  return value && value !== "none" ? value : null;
}

export const projectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  customerId: z.string().optional().transform(noneToNull),
  vesselId: z.string().optional().transform(noneToNull),
  serviceId: z.string().optional().transform(noneToNull),
  consultantId: z.string().min(1, "Please assign a consultant"),
  status: z.enum(["NEW", "PLANNING", "SCHEDULED", "ACTIVE", "COMPLETED", "CLOSED"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

export type ProjectInput = z.infer<typeof projectSchema>;
