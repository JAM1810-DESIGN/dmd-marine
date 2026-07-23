"use client";

import { useActionState, useEffect, useRef } from "react";
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
import { submitBookingForm, type BookingFormState } from "./actions";

const initialState: BookingFormState = {};

type ServiceOption = { id: string; name: string; categoryName: string };

export function BookingForm({
  services,
  defaultServiceId,
}: {
  services: ServiceOption[];
  defaultServiceId?: string;
}) {
  const [state, formAction, isPending] = useActionState(submitBookingForm, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      notify.success("Request received", "We'll be in touch to confirm your booking.");
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="customerName">Name</Label>
          <Input id="customerName" name="customerName" required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="customerEmail">Email</Label>
          <Input id="customerEmail" name="customerEmail" type="email" required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="customerPhone">Phone</Label>
          <Input id="customerPhone" name="customerPhone" type="tel" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="companyName">Company</Label>
          <Input id="companyName" name="companyName" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="vesselName">Vessel Name</Label>
          <Input id="vesselName" name="vesselName" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="port">Port</Label>
          <Input id="port" name="port" />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="serviceId">Service</Label>
        <Select name="serviceId" defaultValue={defaultServiceId} required>
          <SelectTrigger id="serviceId" className="w-full">
            <SelectValue placeholder="Select a service" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.categoryName} — {service.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="preferredDate">Preferred Date</Label>
          <Input id="preferredDate" name="preferredDate" type="date" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="preferredTime">Preferred Time</Label>
          <Input id="preferredTime" name="preferredTime" type="time" />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" rows={4} />
      </div>

      {state.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}

      <Button
        type="submit"
        disabled={isPending}
        className="mt-2 self-start bg-gold text-navy hover:bg-gold/90"
      >
        {isPending ? "Submitting..." : "Submit Booking Request"}
      </Button>
    </form>
  );
}
