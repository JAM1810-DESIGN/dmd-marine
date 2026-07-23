import { auth } from "@/auth";
import { AppError } from "@/lib/errors";
import type { Role } from "@/generated/prisma/enums";

/** Throws if there's no session or the session's role isn't in `allowed`. Returns the session. */
export async function requireRole(...allowed: Role[]) {
  const session = await auth();
  if (!session?.user) {
    throw new AppError("UNAUTHORIZED", "You must be signed in.");
  }
  if (!allowed.includes(session.user.role)) {
    throw new AppError("FORBIDDEN", "You don't have permission to do this.");
  }
  return session;
}
