"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Star, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { notify } from "@/lib/notify";
import {
  createIdentity,
  updateIdentity,
  deleteIdentity,
  setDefaultIdentity,
  type ActionState,
} from "./actions";

export type IdentityRow = {
  id: string;
  name: string;
  greeting: string | null;
  signOff: string | null;
  signatureName: string | null;
  email: string | null;
  phone: string | null;
  isDefault: boolean;
};

function preview(fields: Partial<IdentityRow>) {
  return [
    fields.greeting || "Dear Sir / Ma'am,",
    "",
    "[your message]",
    "",
    fields.signOff || "Best Regards,",
    fields.signatureName || "",
    fields.email || "",
    fields.phone || "",
  ]
    .filter((line, i) => line !== "" || i < 6)
    .join("\n");
}

function IdentityDialog({ identity, trigger }: { identity?: IdentityRow; trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const action = identity ? updateIdentity.bind(null, identity.id) : createIdentity;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  // Live preview state
  const [fields, setFields] = useState<Partial<IdentityRow>>(identity ?? {});
  function set(key: keyof IdentityRow, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    if (state.success) {
      notify.success(identity ? "Identity updated" : "Identity created");
      // Close the dialog once the server action reports success.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success, identity]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{identity ? "Edit identity" : "New reply identity"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="i-name">Identity name</Label>
            <Input
              id="i-name"
              name="name"
              defaultValue={identity?.name}
              placeholder="DMD Marine — Capt. Docdoc"
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="i-greeting">Greeting</Label>
              <Input
                id="i-greeting"
                name="greeting"
                defaultValue={identity?.greeting ?? ""}
                placeholder="Dear Sir / Ma'am,"
                onChange={(e) => set("greeting", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="i-signoff">Sign-off</Label>
              <Input
                id="i-signoff"
                name="signOff"
                defaultValue={identity?.signOff ?? ""}
                placeholder="Best Regards,"
                onChange={(e) => set("signOff", e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="i-signame">Name / title</Label>
            <Input
              id="i-signame"
              name="signatureName"
              defaultValue={identity?.signatureName ?? ""}
              placeholder="Capt. Nicol A. Docdoc"
              onChange={(e) => set("signatureName", e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="i-email">Email address</Label>
              <Input
                id="i-email"
                name="email"
                type="email"
                defaultValue={identity?.email ?? ""}
                placeholder="dmdmarine2010@gmail.com"
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="i-phone">Contact no.</Label>
              <Input
                id="i-phone"
                name="phone"
                defaultValue={identity?.phone ?? ""}
                placeholder="+639064942534"
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="isDefault"
              defaultChecked={identity?.isDefault}
              className="size-4 rounded border-border accent-accent"
            />
            Set as default identity
          </label>

          <div className="grid gap-1.5">
            <Label>Preview</Label>
            <pre className="whitespace-pre-wrap rounded-lg bg-secondary/40 p-3 text-xs text-foreground">
              {preview(fields)}
            </pre>
          </div>

          {state.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="self-end">
            {pending ? "Saving..." : identity ? "Save identity" : "Create identity"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function IdentitiesManager({ identities }: { identities: IdentityRow[] }) {
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteIdentity(id);
      if (result.error) notify.error(result.error);
      else notify.success("Identity deleted");
    });
  }
  function makeDefault(id: string) {
    startTransition(async () => {
      const result = await setDefaultIdentity(id);
      if (result.error) notify.error(result.error);
      else notify.success("Default identity set");
    });
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h1 className="font-heading text-base font-semibold text-foreground">Reply identities</h1>
          <p className="text-sm text-muted-foreground">
            Reusable greeting + signature, auto-filled when you compose or reply.
          </p>
        </div>
        <IdentityDialog
          trigger={
            <Button size="sm">
              <Plus className="size-4" />
              New identity
            </Button>
          }
        />
      </div>

      {identities.length === 0 ? (
        <EmptyState
          className="border-none"
          icon={Plus}
          title="No identities yet"
          description="Create one so replies start with your greeting and signature."
        />
      ) : (
        <ul className="divide-y divide-border">
          {identities.map((identity) => (
            <li key={identity.id} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/40">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {identity.name}
                  {identity.isDefault && (
                    <Badge variant="outline">
                      <Star className="size-3 fill-amber-400 text-amber-500" />
                      Default
                    </Badge>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[identity.greeting, identity.signOff, identity.signatureName, identity.email, identity.phone]
                    .filter(Boolean)
                    .join(" · ") || "No signature details"}
                </p>
              </div>
              {!identity.isDefault && (
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => makeDefault(identity.id)}>
                  <Check className="size-4" />
                  Make default
                </Button>
              )}
              <IdentityDialog
                identity={identity}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label="Edit identity">
                    <Pencil className="size-4" />
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete identity"
                disabled={pending}
                onClick={() => remove(identity.id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
