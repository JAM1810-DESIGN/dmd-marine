import { z } from "zod";

export const messageSchema = z.object({
  toUserId: z.string().min(1, "Please choose a recipient"),
  subject: z.string().optional(),
  body: z.string().min(1, "Message body is required"),
});

export type MessageInput = z.infer<typeof messageSchema>;
