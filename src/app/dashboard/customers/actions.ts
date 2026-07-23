"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import {
  companySchema,
  customerSchema,
  vesselSchema,
  contactHistorySchema,
} from "@/lib/validations/crm";

export type ActionState = { error?: string; success?: boolean };

const CRM_ROLES = ["ADMIN", "MANAGER", "STAFF"] as const;

function emptyToUndefined(value: FormDataEntryValue | null) {
  return value && value !== "" ? String(value) : undefined;
}

// ── Companies ────────────────────────────────────────────────────────────────

export async function createCompany(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...CRM_ROLES);

  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    address: emptyToUndefined(formData.get("address")),
    city: emptyToUndefined(formData.get("city")),
    country: emptyToUndefined(formData.get("country")),
    phone: emptyToUndefined(formData.get("phone")),
    email: formData.get("email") || "",
    website: emptyToUndefined(formData.get("website")),
    notes: emptyToUndefined(formData.get("notes")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  await db.company.create({ data: parsed.data });
  revalidatePath("/dashboard/customers");
  return { success: true };
}

export async function updateCompany(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...CRM_ROLES);

  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    address: emptyToUndefined(formData.get("address")),
    city: emptyToUndefined(formData.get("city")),
    country: emptyToUndefined(formData.get("country")),
    phone: emptyToUndefined(formData.get("phone")),
    email: formData.get("email") || "",
    website: emptyToUndefined(formData.get("website")),
    notes: emptyToUndefined(formData.get("notes")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  await db.company.update({ where: { id }, data: parsed.data });
  revalidatePath("/dashboard/customers");
  return { success: true };
}

// ── Customers ────────────────────────────────────────────────────────────────

export async function createCustomer(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...CRM_ROLES);

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || "",
    phone: emptyToUndefined(formData.get("phone")),
    companyId: formData.get("companyId") || undefined,
    notes: emptyToUndefined(formData.get("notes")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  await db.customer.create({ data: parsed.data });
  revalidatePath("/dashboard/customers");
  return { success: true };
}

export async function updateCustomer(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...CRM_ROLES);

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || "",
    phone: emptyToUndefined(formData.get("phone")),
    companyId: formData.get("companyId") || undefined,
    notes: emptyToUndefined(formData.get("notes")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  await db.customer.update({ where: { id }, data: parsed.data });
  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${id}`);
  return { success: true };
}

// ── Vessels ──────────────────────────────────────────────────────────────────

export async function createVessel(
  customerId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...CRM_ROLES);

  const parsed = vesselSchema.safeParse({
    name: formData.get("name"),
    imoNumber: emptyToUndefined(formData.get("imoNumber")),
    type: emptyToUndefined(formData.get("type")),
    flag: emptyToUndefined(formData.get("flag")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const customer = await db.customer.findUniqueOrThrow({ where: { id: customerId } });
  await db.vessel.create({
    data: { ...parsed.data, customerId, companyId: customer.companyId },
  });
  revalidatePath(`/dashboard/customers/${customerId}`);
  return { success: true };
}

export async function updateVessel(
  id: string,
  customerId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...CRM_ROLES);

  const parsed = vesselSchema.safeParse({
    name: formData.get("name"),
    imoNumber: emptyToUndefined(formData.get("imoNumber")),
    type: emptyToUndefined(formData.get("type")),
    flag: emptyToUndefined(formData.get("flag")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  await db.vessel.update({ where: { id }, data: parsed.data });
  revalidatePath(`/dashboard/customers/${customerId}`);
  return { success: true };
}

// ── Contact history ───────────────────────────────────────────────────────────

export async function addContactHistory(
  customerId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole(...CRM_ROLES);

  const parsed = contactHistorySchema.safeParse({
    type: formData.get("type"),
    summary: formData.get("summary"),
    occurredAt: emptyToUndefined(formData.get("occurredAt")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { occurredAt, ...rest } = parsed.data;
  await db.contactHistory.create({
    data: {
      ...rest,
      customerId,
      createdById: session.user.id,
      occurredAt: occurredAt ? new Date(occurredAt) : undefined,
    },
  });
  revalidatePath(`/dashboard/customers/${customerId}`);
  return { success: true };
}

// ── Bridge: create a CRM customer directly from a booking's contact info ────

export async function addBookingToCrm(bookingId: string) {
  await requireRole(...CRM_ROLES);

  const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
  if (booking.customerId) return { customerId: booking.customerId };

  const company = booking.companyName
    ? await db.company.create({ data: { name: booking.companyName } })
    : null;

  const customer = await db.customer.create({
    data: {
      name: booking.customerName,
      email: booking.customerEmail,
      phone: booking.customerPhone,
      companyId: company?.id,
    },
  });

  const vessel = booking.vesselName
    ? await db.vessel.create({
        data: { name: booking.vesselName, customerId: customer.id, companyId: company?.id },
      })
    : null;

  await db.booking.update({
    where: { id: bookingId },
    data: { customerId: customer.id, companyId: company?.id, vesselId: vessel?.id },
  });

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/customers");
  return { customerId: customer.id };
}
