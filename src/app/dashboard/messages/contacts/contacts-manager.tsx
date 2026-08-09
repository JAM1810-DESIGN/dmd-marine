"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { UserPlus, Pencil, Trash2, Mail, Phone, Building2, Search } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { notify } from "@/lib/notify";
import { createContact, updateContact, deleteContact, type ActionState } from "./actions";

export type ContactRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  notes: string | null;
};

function ContactDialog({ contact, trigger }: { contact?: ContactRow; trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const action = contact ? updateContact.bind(null, contact.id) : createContact;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  useEffect(() => {
    if (state.success) {
      notify.success(contact ? "Contact updated" : "Contact added");
      // Close the dialog once the server action reports success.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success, contact]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit contact" : "New contact"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" name="name" defaultValue={contact?.name} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-email">Email</Label>
            <Input id="c-email" name="email" type="email" defaultValue={contact?.email} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-phone">Phone (optional)</Label>
            <Input id="c-phone" name="phone" defaultValue={contact?.phone ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-company">Company (optional)</Label>
            <Input id="c-company" name="company" defaultValue={contact?.company ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-notes">Notes (optional)</Label>
            <Textarea id="c-notes" name="notes" rows={2} defaultValue={contact?.notes ?? ""} />
          </div>
          {state.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="self-end">
            {pending ? "Saving..." : contact ? "Save" : "Add contact"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ContactsManager({ contacts }: { contacts: ContactRow[] }) {
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = contacts.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q)
    );
  });

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteContact(id);
      if (result.error) notify.error(result.error);
      else notify.success("Contact deleted");
    });
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-base font-semibold text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            {contacts.length} saved contact{contacts.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-44 pl-8 sm:w-56"
            />
          </div>
          <ContactDialog
            trigger={
              <Button size="sm">
                <UserPlus className="size-4" />
                New contact
              </Button>
            }
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          className="border-none"
          icon={UserPlus}
          title={search ? "No matches" : "No contacts yet"}
          description={search ? "Try a different search." : "Add an address to reuse when composing."}
        />
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((contact) => (
            <li key={contact.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/40">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                {contact.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{contact.name}</p>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3" />
                    {contact.email}
                  </span>
                  {contact.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="size-3" />
                      {contact.phone}
                    </span>
                  )}
                  {contact.company && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="size-3" />
                      {contact.company}
                    </span>
                  )}
                </p>
              </div>
              <ContactDialog
                contact={contact}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label="Edit contact">
                    <Pencil className="size-4" />
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete contact"
                disabled={pending}
                onClick={() => remove(contact.id)}
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
