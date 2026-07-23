"use client";

import { useActionState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { submitContactForm, type ContactFormState } from "./actions";

const initialState: ContactFormState = {};

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactForm, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      notify.success("Message sent", "We'll get back to you shortly.");
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" name="phone" type="tel" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="subject">Subject (optional)</Label>
          <Input id="subject" name="subject" />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" required rows={5} />
      </div>

      {state.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}

      <Button
        type="submit"
        disabled={isPending}
        className="mt-2 self-start bg-navy text-white hover:bg-navy/90"
      >
        {isPending ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
