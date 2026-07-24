"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { AppError } from "@/lib/errors";
import { invoiceSchema, paymentSchema } from "@/lib/validations/finance";
import { Prisma } from "@/generated/prisma/client";

export type ActionState = { error?: string; success?: boolean; id?: string };

const MANAGE_ROLES = ["ADMIN", "FINANCE_OFFICER"] as const;

async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const count = await db.invoice.count({ where: { invoiceNumber: { startsWith: `INV-${year}-` } } });
  return `INV-${year}-${String(count + 1).padStart(4, "0")}`;
}

function computeTotals(items: { quantity: number; unitPrice: number; taxRate: number }[], discountAmount: number) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100), 0);
  const totalAmount = Math.max(subtotal + taxAmount - discountAmount, 0);
  return { subtotal, taxAmount, totalAmount };
}

function parseInvoiceForm(formData: FormData) {
  const itemsRaw = formData.get("items");
  let items: unknown[] = [];
  try {
    items = itemsRaw && typeof itemsRaw === "string" ? JSON.parse(itemsRaw) : [];
  } catch {
    items = [];
  }

  return invoiceSchema.safeParse({
    customerId: formData.get("customerId") || undefined,
    companyId: formData.get("companyId") || undefined,
    vesselId: formData.get("vesselId") || undefined,
    serviceId: formData.get("serviceId") || undefined,
    bookingId: formData.get("bookingId") || undefined,
    projectId: formData.get("projectId") || undefined,
    branchId: formData.get("branchId") || undefined,
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate") || undefined,
    paymentTerms: formData.get("paymentTerms") || undefined,
    notes: formData.get("notes") || undefined,
    discountAmount: formData.get("discountAmount") || 0,
    items,
  });
}

export async function createInvoice(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...MANAGE_ROLES);

  const parsed = parseInvoiceForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const { items, issueDate, dueDate, discountAmount, ...rest } = parsed.data;
  const { subtotal, taxAmount, totalAmount } = computeTotals(items, discountAmount);
  const invoiceNumber = await nextInvoiceNumber();

  const invoice = await db.invoice.create({
    data: {
      ...rest,
      invoiceNumber,
      issueDate: new Date(issueDate),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      discountAmount,
      subtotal,
      taxAmount,
      totalAmount,
      items: {
        create: items.map((item) => ({
          description: item.description,
          serviceId: item.serviceId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          lineTotal: item.quantity * item.unitPrice * (1 + item.taxRate / 100),
        })),
      },
    },
  });

  revalidatePath("/dashboard/finance/invoices");
  return { success: true, id: invoice.id };
}

async function assertEditable(id: string) {
  const invoice = await db.invoice.findUniqueOrThrow({ where: { id }, include: { payments: true } });
  if (invoice.payments.length > 0) {
    throw new AppError("BAD_REQUEST", "This invoice already has payments recorded and can't be edited.");
  }
  return invoice;
}

export async function updateInvoice(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...MANAGE_ROLES);
  await assertEditable(id);

  const parsed = parseInvoiceForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const { items, issueDate, dueDate, discountAmount, ...rest } = parsed.data;
  const { subtotal, taxAmount, totalAmount } = computeTotals(items, discountAmount);

  await db.$transaction([
    db.invoiceItem.deleteMany({ where: { invoiceId: id } }),
    db.invoice.update({
      where: { id },
      data: {
        ...rest,
        issueDate: new Date(issueDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        discountAmount,
        subtotal,
        taxAmount,
        totalAmount,
        items: {
          create: items.map((item) => ({
            description: item.description,
            serviceId: item.serviceId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            lineTotal: item.quantity * item.unitPrice * (1 + item.taxRate / 100),
          })),
        },
      },
    }),
  ]);

  revalidatePath("/dashboard/finance/invoices");
  revalidatePath(`/dashboard/finance/invoices/${id}`);
  return { success: true };
}

export async function deleteInvoice(id: string) {
  await requireRole(...MANAGE_ROLES);
  await assertEditable(id);
  await db.invoice.delete({ where: { id } });
  revalidatePath("/dashboard/finance/invoices");
}

export async function markInvoiceSent(id: string) {
  await requireRole(...MANAGE_ROLES);
  await db.invoice.update({ where: { id }, data: { status: "SENT" } });
  revalidatePath("/dashboard/finance/invoices");
  revalidatePath(`/dashboard/finance/invoices/${id}`);
}

export async function cancelInvoice(id: string) {
  await requireRole(...MANAGE_ROLES);
  await db.invoice.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath("/dashboard/finance/invoices");
  revalidatePath(`/dashboard/finance/invoices/${id}`);
}

async function recomputeInvoiceStatus(invoiceId: string) {
  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { payments: { where: { status: "COMPLETED" } } },
  });
  if (invoice.status === "CANCELLED" || invoice.status === "DRAFT") return;

  const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const total = Number(invoice.totalAmount);

  let status: "SENT" | "PARTIAL" | "PAID" | "OVERDUE" = "SENT";
  if (paid >= total && total > 0) status = "PAID";
  else if (paid > 0) status = "PARTIAL";
  else if (invoice.dueDate && invoice.dueDate < new Date()) status = "OVERDUE";

  await db.invoice.update({ where: { id: invoiceId }, data: { status } });
}

export async function recordPayment(
  invoiceId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...MANAGE_ROLES);

  const parsed = paymentSchema.safeParse({
    paymentDate: formData.get("paymentDate"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    referenceNumber: formData.get("referenceNumber") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  await db.payment.create({
    data: {
      ...parsed.data,
      paymentDate: new Date(parsed.data.paymentDate),
      invoiceId,
      status: "COMPLETED",
    },
  });

  await recomputeInvoiceStatus(invoiceId);

  revalidatePath("/dashboard/finance/invoices");
  revalidatePath(`/dashboard/finance/invoices/${invoiceId}`);
  revalidatePath("/dashboard/finance/payments");
  return { success: true };
}

export async function refundPayment(paymentId: string) {
  await requireRole(...MANAGE_ROLES);
  const payment = await db.payment.update({ where: { id: paymentId }, data: { status: "REFUNDED" } });
  await recomputeInvoiceStatus(payment.invoiceId);
  revalidatePath("/dashboard/finance/invoices");
  revalidatePath(`/dashboard/finance/invoices/${payment.invoiceId}`);
  revalidatePath("/dashboard/finance/payments");
}

/** Lazily flips SENT/PARTIAL invoices past their due date to OVERDUE. Call on page load. */
export async function refreshOverdueInvoices() {
  const overdue = await db.invoice.findMany({
    where: { status: { in: ["SENT", "PARTIAL"] }, dueDate: { lt: new Date() } },
  });
  if (overdue.length === 0) return;

  await db.$transaction([
    db.invoice.updateMany({
      where: { id: { in: overdue.map((i) => i.id) } },
      data: { status: "OVERDUE" },
    }),
    db.notification.createMany({
      data: overdue.map((invoice) => ({
        type: "INVOICE_OVERDUE" as const,
        title: "Invoice overdue",
        message: `Invoice ${invoice.invoiceNumber} is now overdue.`,
        link: `/dashboard/finance/invoices/${invoice.id}`,
      })),
    }),
  ]);
}

export async function createInvoiceFromBooking(bookingId: string): Promise<ActionState> {
  await requireRole(...MANAGE_ROLES);

  const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { service: true } });
  const invoiceNumber = await nextInvoiceNumber();

  const invoice = await db.invoice.create({
    data: {
      invoiceNumber,
      customerId: booking.customerId,
      companyId: booking.companyId,
      vesselId: booking.vesselId,
      serviceId: booking.serviceId,
      bookingId: booking.id,
      branchId: booking.branchId,
      issueDate: new Date(),
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
      items: {
        create: [{ description: booking.service.name, quantity: new Prisma.Decimal(1), unitPrice: 0, taxRate: 0, lineTotal: 0 }],
      },
    },
  });

  revalidatePath("/dashboard/finance/invoices");
  revalidatePath("/dashboard/bookings");
  return { success: true, id: invoice.id };
}
