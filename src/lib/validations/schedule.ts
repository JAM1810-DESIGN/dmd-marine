import { z } from "zod";

export const scheduleSchema = z
  .object({
    type: z.enum(["CONSULTATION", "SURVEY", "INSPECTION", "TRAINING", "OTHER"]),
    title: z.string().min(1, "Title is required"),
    startAt: z.string().min(1, "Start time is required"),
    endAt: z.string().min(1, "End time is required"),
    consultantId: z.string().min(1, "Please assign a consultant"),
    notes: z.string().optional(),
  })
  .refine((data) => new Date(data.endAt) > new Date(data.startAt), {
    message: "End time must be after the start time",
    path: ["endAt"],
  });

export type ScheduleInput = z.infer<typeof scheduleSchema>;
