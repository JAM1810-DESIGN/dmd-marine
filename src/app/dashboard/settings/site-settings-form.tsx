"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { updateSiteSettings } from "./actions";

type SiteSettings = {
  companyName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  facebookUrl: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  whatsapp: string | null;
};

export function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateSiteSettings({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      notify.success("Site settings updated");
    });
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="p-4">
        <h2 className="font-heading text-base font-semibold">Site Settings</h2>
        <p className="text-sm text-muted-foreground">
          Contact details and social links shown across the public website.
        </p>
      </div>

      <form action={handleSubmit} className="flex flex-col gap-4 p-4 pt-0">
        <div className="grid gap-1.5">
          <Label htmlFor="companyName">Company Name</Label>
          <Input id="companyName" name="companyName" defaultValue={settings.companyName} required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={settings.email ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={settings.phone ?? ""} />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" defaultValue={settings.address ?? ""} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={settings.city ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" defaultValue={settings.country ?? ""} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="facebookUrl">Facebook URL</Label>
            <Input id="facebookUrl" name="facebookUrl" defaultValue={settings.facebookUrl ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
            <Input id="linkedinUrl" name="linkedinUrl" defaultValue={settings.linkedinUrl ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="instagramUrl">Instagram URL</Label>
            <Input id="instagramUrl" name="instagramUrl" defaultValue={settings.instagramUrl ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" name="whatsapp" defaultValue={settings.whatsapp ?? ""} />
          </div>
        </div>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <Button type="submit" disabled={isPending} className="self-end">
          {isPending ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </div>
  );
}
