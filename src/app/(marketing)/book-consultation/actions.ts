"use server";

import { db } from "@/lib/db";
import { bookingSchema } from "@/lib/validations/booking";
import { isStorageConfigured, uploadFile } from "@/lib/storage";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export type BookingFormState = { error?: string; success?: boolean };

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export async function submitBookingForm(
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const ip = await getClientIp();
  const { allowed } = rateLimit(`booking:${ip}`, 5, 60 * 60 * 1000);
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

  const { preferredDate, ...rest } = parsed.data;

  const booking = await db.booking.create({
    data: {
      ...rest,
      preferredDate: preferredDate ? new Date(preferredDate) : undefined,
    },
    include: { service: true },
  });

  if (attachments.length > 0) {
    const uploaded = await Promise.all(
      attachments.map((file) => uploadFile(file, `bookings/${booking.id}`)),
    );
    await db.document.createMany({
      data: uploaded.map((file) => ({
        fileName: file.fileName,
        url: file.url,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        category: "BOOKING_ATTACHMENT",
        bookingId: booking.id,
      })),
    });
  }

  await db.notification.create({
    data: {
      type: "NEW_BOOKING",
      title: "New booking request",
      message: `${booking.customerName} requested ${booking.service.name}`,
      link: "/dashboard/bookings",
    },
  });

  return { success: true };
}
