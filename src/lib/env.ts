import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  AUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.url(),
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  // Optional: enables the AI draft-reply and Ask AI help features when set.
  ANTHROPIC_API_KEY: z.string().optional(),
  // Optional: enables sending external (website) message replies by email.
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment variables:",
    z.treeifyError(parsed.error),
  );
  throw new Error("Invalid environment variables — check .env against .env.example");
}

export const env = parsed.data;
