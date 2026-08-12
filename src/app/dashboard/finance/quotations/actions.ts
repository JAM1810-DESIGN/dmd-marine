"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { quotationSchema } from "@/lib/validations/quotation";
import type { QuotationStatus } from "@/generated/prisma/client";

export type ActionState = { error?: string; success?: boolean; id?: string; attached?: boolean };

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MANAGE_ROLES = ["ADMIN", "MANAGER", "FINANCE_OFFICER"] as const;

async function nextQuoteNumber() {
  const year = new Date().getFullYear();
  const count = await db.quotation.count({ where: { quoteNumber: { startsWith: `QT-${year}-` } } });
  return `QT-${year}-${String(count + 1).padStart(4, "0")}`;
}

function parseForm(formData: FormData) {
  let items: unknown[] = [];
  let scope: string[] = [];
  let reporting: string[] = [];
  let exclusions: string[] = [];
  let sections: unknown[] = [];
  try {
    const raw = formData.get("items");
    items = raw ? JSON.parse(String(raw)) : [];
  } catch {
    items = [];
  }
  try {
    const raw = formData.get("scope");
    scope = raw ? JSON.parse(String(raw)) : [];
  } catch {
    scope = [];
  }
  try {
    const raw = formData.get("reporting");
    reporting = raw ? JSON.parse(String(raw)) : [];
  } catch {
    reporting = [];
  }
  try {
    const raw = formData.get("exclusions");
    exclusions = raw ? JSON.parse(String(raw)) : [];
  } catch {
    exclusions = [];
  }
  try {
    const raw = formData.get("sections");
    sections = raw ? JSON.parse(String(raw)) : [];
  } catch {
    sections = [];
  }

  return quotationSchema.safeParse({
    title: formData.get("title"),
    billTo: formData.get("billTo"),
    attention: formData.get("attention") || undefined,
    vesselName: formData.get("vesselName") || undefined,
    location: formData.get("location") || undefined,
    currency: formData.get("currency") || "USD",
    quoteDate: formData.get("quoteDate"),
    validityDays: formData.get("validityDays") || 30,
    paymentTerms: formData.get("paymentTerms") || undefined,
    conditions: formData.get("conditions") || undefined,
    scopeTitle: formData.get("scopeTitle") || undefined,
    scope: scope.filter((line) => line.trim().length > 0),
    reporting: reporting.filter((line) => line.trim().length > 0),
    exclusions: exclusions.filter((line) => line.trim().length > 0),
    sections,
    notes: formData.get("notes") || undefined,
    taxRatePercent: formData.get("taxRatePercent") || 0,
    customerId: formData.get("customerId") || undefined,
    items,
  });
}

export async function createQuotation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(...MANAGE_ROLES);
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const { items, quoteDate, ...rest } = parsed.data;
  const quoteNumber = await nextQuoteNumber();

  const quotation = await db.quotation.create({
    data: {
      ...rest,
      quoteNumber,
      quoteDate: new Date(quoteDate),
      createdById: session.user.id,
      items: {
        create: items.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
          order: index,
        })),
      },
    },
  });

  revalidatePath("/dashboard/finance/quotations");

  // Launched from a message thread → attach the quotation back to that
  // customer's conversation as a staff message with a summary and link.
  const returnEmail = String(formData.get("returnEmail") ?? "").trim();
  if (returnEmail) {
    const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
    const total = subtotal + (subtotal * (Number(rest.taxRatePercent) || 0)) / 100;
    const body = [
      `Quotation ${quoteNumber} — ${rest.title}`,
      "",
      ...items.filter((it) => it.description.trim()).map((it) => `- ${it.description}: ${rest.currency} ${money(it.quantity * it.unitPrice)}`),
      "",
      `Total: ${rest.currency} ${money(total)}`,
      `Validity: ${rest.validityDays} days`,
      `Payment terms: ${rest.paymentTerms ?? ""}`,
      "",
      `View / edit: /dashboard/finance/quotations/${quotation.id}`,
    ].join("\n");
    try {
      await db.message.create({
        data: {
          channel: "EMAIL",
          externalEmail: returnEmail,
          externalName: rest.billTo,
          fromUserId: session.user.id,
          subject: `Quotation ${quoteNumber} — ${rest.title}`,
          body,
        },
      });
      revalidatePath("/dashboard/messages");
      return { success: true, id: quotation.id, attached: true };
    } catch {
      // The quotation itself saved; just don't claim it was attached.
      return { success: true, id: quotation.id };
    }
  }

  return { success: true, id: quotation.id };
}

export async function updateQuotation(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...MANAGE_ROLES);
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const { items, quoteDate, ...rest } = parsed.data;

  await db.$transaction([
    db.quotationItem.deleteMany({ where: { quotationId: id } }),
    db.quotation.update({
      where: { id },
      data: {
        ...rest,
        quoteDate: new Date(quoteDate),
        items: {
          create: items.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.quantity * item.unitPrice,
            order: index,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/dashboard/finance/quotations");
  revalidatePath(`/dashboard/finance/quotations/${id}`);
  return { success: true, id };
}

export async function setQuotationStatus(id: string, status: QuotationStatus): Promise<ActionState> {
  await requireRole(...MANAGE_ROLES);
  await db.quotation.update({ where: { id }, data: { status } });
  revalidatePath("/dashboard/finance/quotations");
  revalidatePath(`/dashboard/finance/quotations/${id}`);
  return { success: true };
}

export async function deleteQuotation(id: string): Promise<ActionState> {
  await requireRole(...MANAGE_ROLES);
  await db.quotation.delete({ where: { id } });
  revalidatePath("/dashboard/finance/quotations");
  return { success: true };
}
