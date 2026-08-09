"use client";

import { useRef, useState, useTransition } from "react";
import { Mail, Users, Paperclip, X, FileText, Save } from "lucide-react";
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
import { buildIdentityBody } from "./identity-format";
import { sendMessage, composeExternalEmail, saveDraft } from "./actions";

type Mode = "email" | "staff";

export type ComposeContact = { id: string; name: string; email: string };
export type ComposeIdentity = {
  id: string;
  name: string;
  greeting: string | null;
  signOff: string | null;
  signatureName: string | null;
  email: string | null;
  phone: string | null;
  isDefault: boolean;
};

export type ComposeProps = {
  recipients: { id: string; name: string }[];
  contacts: ComposeContact[];
  identities: ComposeIdentity[];
};

type ComposeInitial = { to?: string; cc?: string; subject?: string; body?: string; draftId?: string };

export function ComposeDialog({
  trigger,
  recipients,
  contacts,
  identities,
  initial,
}: ComposeProps & { trigger: React.ReactElement; initial?: ComposeInitial }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("email");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const defaultIdentity = identities.find((i) => i.isDefault) ?? identities[0];
  // A brand-new email starts with the default identity already laid out in the
  // body, so you see the full email before typing. Drafts keep their saved body.
  const startingBody = initial?.body ?? (defaultIdentity ? buildIdentityBody(defaultIdentity) : "");

  const [to, setTo] = useState(initial?.to ?? "");
  const [cc, setCc] = useState(initial?.cc ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(startingBody);
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const draftId = initial?.draftId;

  function reset() {
    setTo(initial?.to ?? "");
    setCc(initial?.cc ?? "");
    setSubject(initial?.subject ?? "");
    setBody(startingBody);
    setFiles([]);
    setError(undefined);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 5));
    if (fileInput.current) fileInput.current.value = "";
  }
  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function applyIdentity(id: string) {
    const identity = identities.find((i) => i.id === id);
    if (identity) setBody(buildIdentityBody(identity));
  }

  function emailFormData() {
    const fd = new FormData();
    fd.set("to", to);
    fd.set("cc", cc);
    fd.set("subject", subject);
    fd.set("body", body);
    if (draftId) fd.set("draftId", draftId);
    return fd;
  }

  function sendEmail() {
    startTransition(async () => {
      const fd = emailFormData();
      for (const file of files) fd.append("attachments", file);
      const result = await composeExternalEmail(fd);
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

  function storeDraft() {
    startTransition(async () => {
      const result = await saveDraft(emailFormData());
      if (result.error) {
        setError(result.error);
        return;
      }
      notify.success("Draft saved");
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{draftId ? "Edit draft" : "New message"}</DialogTitle>
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
              <Input value="DMD Marine <dmdmarine2010@gmail.com>" readOnly disabled />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="email"
                list="compose-contacts"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                placeholder="recipient@email.com"
              />
              <datalist id="compose-contacts">
                {contacts.map((c) => (
                  <option key={c.id} value={c.email}>
                    {c.name}
                  </option>
                ))}
              </datalist>
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
              <Input id="email-subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
            </div>

            {identities.length > 0 && (
              <div className="grid gap-1.5">
                <Label>Insert identity</Label>
                <Select onValueChange={(v) => { if (typeof v === "string") applyIdentity(v); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Greeting + signature…" />
                  </SelectTrigger>
                  <SelectContent>
                    {identities.map((identity) => (
                      <SelectItem key={identity.id} value={identity.id}>
                        {identity.name}
                        {identity.isDefault ? " (default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="email-body">Message</Label>
              <Textarea id="email-body" rows={14} value={body} onChange={(event) => setBody(event.target.value)} />
            </div>

            <input ref={fileInput} type="file" multiple hidden onChange={(event) => addFiles(event.target.files)} />
            {files.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-1.5 rounded-md bg-secondary/60 px-2 py-1 text-xs text-foreground"
                  >
                    <FileText className="size-3.5 text-muted-foreground" />
                    <span className="max-w-[12rem] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
                <Paperclip className="size-4" />
                Attach
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={storeDraft} disabled={isPending}>
                  <Save className="size-4" />
                  Save draft
                </Button>
                <Button onClick={sendEmail} disabled={isPending}>
                  <Mail className="size-4" />
                  {isPending ? "Sending..." : "Send email"}
                </Button>
              </div>
            </div>
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
