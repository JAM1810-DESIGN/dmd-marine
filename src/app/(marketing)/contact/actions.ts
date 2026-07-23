"use server";

import { db } from "@/lib/db";
import { contactSchema } from "@/lib/validations/contact";

export type ContactFormState = { error?: string; success?: boolean };

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    subject: formData.get("subject") || undefined,
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  await db.contactSubmission.create({ data: parsed.data });

  await db.notification.create({
    data: {
      type: "NEW_INQUIRY",
      title: "New contact form submission",
      message: `${parsed.data.name} sent a message${parsed.data.subject ? `: ${parsed.data.subject}` : "."}`,
      link: "/dashboard",
    },
  });

  return { success: true };
}
