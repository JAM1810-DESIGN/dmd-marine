import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ContactsManager, type ContactRow } from "./contacts-manager";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage() {
  const contacts = await db.contact.findMany({ orderBy: { name: "asc" } });
  const rows: ContactRow[] = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    notes: c.notes,
  }));

  return <ContactsManager contacts={rows} />;
}
