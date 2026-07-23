"use server";

import { db } from "@/lib/db";
import { bookingSchema } from "@/lib/validations/booking";

export type BookingFormState = { error?: string; success?: boolean };

export async function submitBookingForm(
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
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

  const { preferredDate, ...rest } = parsed.data;

  const booking = await db.booking.create({
    data: {
      ...rest,
      preferredDate: preferredDate ? new Date(preferredDate) : undefined,
    },
    include: { service: true },
  });

  await db.notification.create({
    data: {
      type: "NEW_BOOKING",
      title: "New booking request",
      message: `${booking.customerName} requested ${booking.service.name}`,
      link: "/dashboard",
    },
  });

  return { success: true };
}
