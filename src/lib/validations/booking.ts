import { z } from "zod";

export const bookingSchema = z.object({
  customerName: z.string().min(2, "Please enter your name"),
  customerEmail: z.email("Please enter a valid email"),
  customerPhone: z.string().optional(),
  companyName: z.string().optional(),
  vesselName: z.string().optional(),
  port: z.string().optional(),
  serviceId: z.string().min(1, "Please select a service"),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  message: z.string().optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;
