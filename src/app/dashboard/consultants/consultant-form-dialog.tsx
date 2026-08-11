"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notify } from "@/lib/notify";
import { CONSULTANT_RANKS } from "@/lib/consultant-ranks";
import { createConsultant, updateConsultant } from "./actions";

export type ConsultantRecord = {
  id: string;
  name: string;
  email: string;
  rank: string | null;
  vesselExperience: string | null;
  phone: string | null;
  address: string | null;
  baseLocations: string[];
  availability: string;
};

const BASE_LOCATION_SLOTS = 5;

export const AVAILABILITY_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "NOT_AVAILABLE", label: "Not available" },
  { value: "ONBOARD", label: "Onboard" },
] as const;

export function ConsultantFormDialog({
  trigger,
  consultant,
}: {
  trigger: React.ReactElement;
  consultant?: ConsultantRecord;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [rank, setRank] = useState(consultant?.rank ?? "none");
  const [availability, setAvailability] = useState(consultant?.availability ?? "AVAILABLE");
  const rankItems = [{ value: "none", label: "None" }, ...CONSULTANT_RANKS.map((r) => ({ value: r, label: r }))];
  const availabilityItems = AVAILABILITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = consultant
        ? await updateConsultant(consultant.id, {}, formData)
        : await createConsultant({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(undefined);
      notify.success(consultant ? "Consultant updated" : "Consultant created");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{consultant ? "Edit Consultant" : "New Consultant"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={consultant?.name} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={consultant?.email} required />
          </div>
          {!consultant && (
            <div className="grid gap-1.5">
              <Label htmlFor="password">Temporary Password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="rank">Rank</Label>
            <Select
              name="rank"
              items={rankItems}
              value={rank}
              onValueChange={(v) => { if (typeof v === "string") setRank(v); }}
            >
              <SelectTrigger id="rank" className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {CONSULTANT_RANKS.map((rank) => (
                  <SelectItem key={rank} value={rank}>
                    {rank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="vesselExperience">Vessel Experience</Label>
            <Textarea
              id="vesselExperience"
              name="vesselExperience"
              defaultValue={consultant?.vesselExperience ?? ""}
              rows={3}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={consultant?.phone ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="availability">Availability</Label>
            <Select
              name="availability"
              items={availabilityItems}
              value={availability}
              onValueChange={(v) => { if (typeof v === "string") setAvailability(v); }}
            >
              <SelectTrigger id="availability" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABILITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              name="address"
              defaultValue={consultant?.address ?? ""}
              rows={2}
              placeholder="Street, city, country"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Base locations (up to 5 ports / cities)</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: BASE_LOCATION_SLOTS }).map((_, index) => (
                <Input
                  key={index}
                  name="baseLocations"
                  defaultValue={consultant?.baseLocations[index] ?? ""}
                  placeholder={`Location ${index + 1}`}
                  aria-label={`Base location ${index + 1}`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Used to highlight the nearest consultant when assigning work. Blank boxes are ignored.
            </p>
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending} className="self-end">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
