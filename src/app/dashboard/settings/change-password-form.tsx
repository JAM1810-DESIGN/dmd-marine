"use client";

import { useActionState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { changeOwnPassword } from "./actions";
import type { ActionState } from "./actions";

const initialState: ActionState = {};

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changeOwnPassword, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      notify.success("Password changed", "Use your new password next time you sign in.");
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <div className="rounded-xl border-t-[3px] border-t-neutral-400 bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="font-heading text-base font-semibold">Change Password</h2>
      <p className="text-sm text-muted-foreground">
        Update the password for your own account.
      </p>

      <form ref={formRef} action={formAction} className="mt-4 flex max-w-sm flex-col gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>

        {state.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}

        <Button type="submit" disabled={isPending} className="self-start">
          {isPending ? "Saving..." : "Change Password"}
        </Button>
      </form>
    </div>
  );
}
