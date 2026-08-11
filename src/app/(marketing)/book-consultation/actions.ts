"use server";

import { db } from "@/lib/db";
import { bookingSchema } from "@/lib/validations/booking";
import { isStorageConfigured } from "@/lib/storage";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export type BookingFormState = { error?: string; success?: boolean };

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export async function submitBookingForm(
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const ip = await getClientIp();
  const { allowed } = await rateLimit(`booking:${ip}`, 5, 60 * 60 * 1000);
  if (!allowed) {
    return { error: "Too many requests from this connection. Please try again later." };
  }

  const parsed = bookingSchema.safeParse({
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone") || undefined,
    companyName: formData.get("companyName") || undefined,
    vesselName: formData.get("vesselName") || undefined,
    port: formData.get("port") || undefined,
    serviceId: formData.get("serviceId"),
    preferredDate: formData.get("preferredDate") || undefined,
    preferredTime: formData.get("preferredTime") || undefined,
    message: formData.get("message") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const attachments = isStorageConfigured
    ? formData.getAll("attachments").filter((entry): entry is File => entry instanceof File && entry.size > 0)
    : [];

  if (attachments.length > MAX_ATTACHMENTS) {
    return { error: `Please attach at most ${MAX_ATTACHMENTS} files.` };
  }
  if (attachments.some((file) => file.size > MAX_ATTACHMENT_BYTES)) {
    return { error: "Each attachment must be 10 MB or smaller." };
  }

  const { preferredDate, serviceId, ...rest } = parsed.data;
  const service = await db.service.findUnique({ where: { id: serviceId }, select: { name: true } });
  const serviceName = service?.name ?? "a consultation";

  // Requests land in Messages first as an external conversation. The booking is
  // only created later, when a staff member confirms it (payload holds the data).
  const details = [
    rest.vesselName ? `Vessel: ${rest.vesselName}` : null,
    rest.port ? `Port: ${rest.port}` : null,
    rest.companyName ? `Company: ${rest.companyName}` : null,
    rest.customerPhone ? `Phone: ${rest.customerPhone}` : null,
    preferredDate ? `Preferred date: ${preferredDate}${rest.preferredTime ? ` ${rest.preferredTime}` : ""}` : null,
  ].filter(Boolean);

  const body = [
    `New consultation request for ${serviceName}.`,
    rest.message ? `\n"${rest.message}"` : "",
    details.length ? `\n\n${details.join("\n")}` : "",
  ].join("");

  await db.message.create({
    data: {
      channel: "EMAIL",
      subject: `Consultation request: ${serviceName}`,
      body,
      externalEmail: rest.customerEmail,
      externalName: rest.customerName,
      payload: { kind: "booking", serviceId, preferredDate: preferredDate ?? null, ...rest },
    },
  });

  await db.notification.create({
    data: {
      type: "NEW_BOOKING",
      title: "New consultation request",
      message: `${rest.customerName} requested ${serviceName}`,
      link: "/dashboard/messages",
    },
  });

  return { success: true };
}
