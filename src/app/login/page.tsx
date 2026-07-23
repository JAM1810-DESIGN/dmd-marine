import type { Metadata } from "next";
import { Anchor } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-navy p-10 text-white lg:flex">
        <div className="flex items-center gap-2">
          <Anchor className="size-7 text-gold" aria-hidden />
          <span className="font-heading text-lg font-semibold">DMD Marine</span>
        </div>
        <div>
          <p className="text-2xl font-medium text-balance">
            Independent Marine Expertise for Vessel Operations, Cargo Assurance,
            Compliance, and Maritime Professional Development.
          </p>
        </div>
        <p className="text-sm text-white/50">
          {`© ${new Date().getFullYear()} DMD Marine Consultation & Services`}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col gap-1 lg:hidden">
            <div className="flex items-center gap-2 text-navy">
              <Anchor className="size-6 text-gold" aria-hidden />
              <span className="font-heading text-lg font-semibold">DMD Marine</span>
            </div>
          </div>

          <h1 className="text-xl font-semibold text-foreground">Staff sign in</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Sign in with your DMD Marine staff account to access the dashboard.
          </p>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
