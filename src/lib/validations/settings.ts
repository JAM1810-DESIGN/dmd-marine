import { z } from "zod";

export const siteSettingsSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  facebookUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  whatsapp: z.string().optional(),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
