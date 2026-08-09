"use client";

import { useState, useTransition } from "react";
import { Mail, Users } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { sendMessage, composeExternalEmail } from "./actions";

type Mode = "email" | "staff";

export function ComposeDialog({
  trigger,
  recipients,
}: {
  trigger: React.ReactElement;
  recipients: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("email");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  // Email fields
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  function reset() {
    setTo("");
    setCc("");
    setSubject("");
    setBody("");
    setError(undefined);
  }

  function sendEmail() {
    startTransition(async () => {
      const result = await composeExternalEmail({ to, cc, subject, body });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.warning) notify.info(result.warning);
      else notify.success("Email sent");
      reset();
      setOpen(false);
    });
  }

  function sendStaff(formData: FormData) {
    startTransition(async () => {
      const result = await sendMessage({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      notify.success("Message sent");
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 rounded-lg bg-secondary/50 p-1">
          <button
            type="button"
            onClick={() => setMode("email")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
              mode === "email" ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            <Mail className="size-4" />
            Email
          </button>
          <button
            type="button"
            onClick={() => setMode("staff")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
              mode === "staff" ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            <Users className="size-4" />
            Staff
          </button>
        </div>

        {mode === "email" ? (
          <div className="flex flex-col gap-3">
            <div className="grid gap-1.5">
              <Label>From</Label>
              <Input value="DMD Marine" readOnly disabled />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="email"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                placeholder="recipient@email.com"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cc">Cc (optional)</Label>
              <Input
                id="cc"
                value={cc}
                onChange={(event) => setCc(event.target.value)}
                placeholder="Comma-separated addresses"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email-body">Message</Label>
              <Textarea
                id="email-body"
                rows={5}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <Button onClick={sendEmail} disabled={isPending} className="self-end">
              <Mail className="size-4" />
              {isPending ? "Sending..." : "Send email"}
            </Button>
          </div>
        ) : (
          <form action={sendStaff} className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="toUserId">To</Label>
              <Select name="toUserId" required>
                <SelectTrigger id="toUserId" className="w-full">
                  <SelectValue placeholder="Select a recipient" />
                </SelectTrigger>
                <SelectContent>
                  {recipients.map((recipient) => (
                    <SelectItem key={recipient.id} value={recipient.id}>
                      {recipient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="subject">Subject (optional)</Label>
              <Input id="subject" name="subject" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="staff-body">Message</Label>
              <Textarea id="staff-body" name="body" rows={4} required />
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <Button type="submit" disabled={isPending} className="self-end">
              {isPending ? "Sending..." : "Send"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
