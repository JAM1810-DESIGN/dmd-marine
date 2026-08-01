"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function loginAction(_prevState: string | undefined, formData: FormData) {
  const ip = await getClientIp();
  const { allowed } = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!allowed) {
    return "Too many sign-in attempts. Please wait a few minutes and try again.";
  }

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid email or password.";
        default:
          return "Something went wrong. Please try again.";
      }
    }
    throw error;
  }
}
