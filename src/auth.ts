import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";
import { verifyPassword, DUMMY_PASSWORD_HASH } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import type { Role } from "@/generated/prisma/enums";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
  interface User {
    role: Role;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Staff sessions carry access to customer, booking, and financial data — keep the
  // window shorter than NextAuth's 30-day default and re-issue on activity.
  session: { strategy: "jwt", maxAge: 8 * 60 * 60, updateAge: 60 * 60 },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await db.user.findUnique({ where: { email } });
        // Always run bcrypt against a hash (real or dummy) so response timing doesn't
        // reveal whether an email is registered.
        const passwordValid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
        if (!user || !user.isActive || !passwordValid) {
          await logAudit({
            userId: user?.id ?? null,
            action: "LOGIN_FAILED",
            entityType: "User",
            entityId: user?.id ?? null,
            metadata: { email },
          }).catch(() => undefined);
          return null;
        }

        await logAudit({
          userId: user.id,
          action: "LOGIN_SUCCESS",
          entityType: "User",
          entityId: user.id,
        }).catch(() => undefined);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
});
