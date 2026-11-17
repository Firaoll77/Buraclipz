import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateEthiopianPhone } from "@/lib/phone";
import { createAddisDateTime, getAddisDateString } from "@/lib/date-utils";
import {
  getServiceById,
  getAllBarbers,
  getBarberById,
} from "@/lib/data-store";
import { bookAppointmentWithProtection, DoubleBookingError } from "@/lib/booking-transaction";
import { verifyUploadReceipt } from "@/lib/upload-receipt";
import { SCREENSHOT_FOLDER } from "@/lib/cloudinary";
import { dispatchBookingConfirmation } from "@/lib/notifications";
import { calculateBarberDaySlots } from "@/lib/availability";
import {
  getDayOfWeekFromDateString,
} from "@/lib/date-utils";
import {
  getBarberWorkingHours,
  getBarberAppointmentsForDay,
  getBarberTimeOff,
} from "@/lib/data-store";

const bookingSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  barberId: z.string().min(1, "Barber is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:mm"),
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerPhone: z.string().min(9, "Phone number is required"),
  paymentScreenshot: z.string().optional(),
  paymentPublicId: z.string().max(512).optional(),
  uploadReceipt: z.string().max(2048).optional(),
});

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      serviceId,
      barberId: requestedBarberId,
      date: dateStr,
      time: timeStr,
      customerName,
      customerPhone,
      paymentScreenshot,
      paymentPublicId,
      uploadReceipt,
    } = parsed.data;

    // Verify the payment screenshot asset reference server-side.
    // New bookings must reference an asset uploaded via /api/upload
    // (receipt proves folder ownership, validity, and freshness).
    let verifiedPublicId: string | null = null;
    if (paymentPublicId) {
      const validFormat =
        paymentPublicId.startsWith(`${SCREENSHOT_FOLDER}/`) &&
        /^[\w\-./]+$/.test(paymentPublicId) &&
        !paymentPublicId.includes("..");
      if (
        !validFormat ||
        !uploadReceipt ||
        !verifyUploadReceipt(uploadReceipt, paymentPublicId)
      ) {
        return NextResponse.json(
          { error: "Invalid or expired payment screenshot. Please re-upload and try again." },
          { status: 400 }
        );
      }
      verifiedPublicId = paymentPublicId;
    }

    // Legacy paymentScreenshot submissions are no longer accepted for new
    // bookings — arbitrary strings/data URLs must not be persisted.
    // Historical records are unaffected: the admin display layer still
    // renders legacy values stored before this change.
    if (
      paymentScreenshot &&
      paymentScreenshot.trim() !== "" &&
      !verifiedPublicId
    ) {
      return NextResponse.json(
        {
          error:
            "Direct screenshot submissions are no longer accepted. Please re-upload your payment screenshot.",
        },
        { status: 400 }
      );
    }

    // 1. Validate Ethiopian Phone Number
    const phoneValidation = validateEthiopianPhone(customerPhone);
    if (!phoneValidation.isValid || !phoneValidation.normalized) {
      return NextResponse.json(
        { error: phoneValidation.error || "Invalid Ethiopian phone number" },
        { status: 400 }
      );
    }

    // 1b. Reject bookings for past dates (compared in Addis Ababa time)
    if (dateStr < getAddisDateString(new Date())) {
      return NextResponse.json(
        { error: "Cannot book an appointment in the past." },
        { status: 400 }
      );
    }

    // 2. Fetch service
    const service = await getServiceById(serviceId);
    if (!service || !service.isActive) {
      return NextResponse.json({ error: "Selected service not found" }, { status: 404 });
    }

    // 3. Resolve assigned barber if "any" was selected
    let assignedBarberId = requestedBarberId;
    if (requestedBarberId === "any") {
      const allBarbers = await getAllBarbers();
      const dayOfWeek = getDayOfWeekFromDateString(dateStr);
      const dayStart = createAddisDateTime(dateStr, "00:00");
      const dayEnd = createAddisDateTime(dateStr, "23:59");

      let foundBarberId: string | null = null;
      for (const b of allBarbers) {
        if (!b.isActive) continue;
        const wh = await getBarberWorkingHours(b.id, dayOfWeek);
        const appts = await getBarberAppointmentsForDay(b.id, dayStart, dayEnd);
        const offs = await getBarberTimeOff(b.id, dayStart, dayEnd);

        const slots = calculateBarberDaySlots({
          targetDateStr: dateStr,
          barberId: b.id,
          barberName: b.name,
          serviceDurationMinutes: service.durationMinutes,
          workingHours: wh,
          existingAppointments: appts,
          timeOffs: offs,
        });

        if (slots.some((s) => s.timeStr === timeStr)) {
          foundBarberId = b.id;
          break;
        }
      }

      if (!foundBarberId) {
        return NextResponse.json(
          { error: "No barber is available for this slot. Please pick another time." },
          { status: 409 }
        );
      }
      assignedBarberId = foundBarberId;
    }

    const barber = await getBarberById(assignedBarberId);
    if (!barber || !barber.isActive) {
      return NextResponse.json({ error: "Barber not found" }, { status: 404 });
    }

    // 4. Calculate start and end DateTime in Addis Ababa
    const startTime = createAddisDateTime(dateStr, timeStr);
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

    // 5. Create Appointment with double-booking transaction protection
    const appointment = await bookAppointmentWithProtection({
      serviceId: service.id,
      barberId: barber.id,
      startTime,
      endTime,
      customerName,
      customerPhone: phoneValidation.normalized,
      paymentScreenshot: verifiedPublicId ? null : paymentScreenshot || null,
      paymentPublicId: verifiedPublicId,
      notes: null,
    });

    // 6. Asynchronously dispatch confirmation notifications (Resend Email, Telegram, optional SMS)
    dispatchBookingConfirmation({
      id: appointment.id,
      bookingReference: appointment.bookingReference,
      customerName: appointment.customerName || customerName,
      customerPhone: appointment.customerPhone || phoneValidation.normalized,
      barberName: appointment.barberName || barber.name,
      serviceName: appointment.serviceName || service.name,
      durationMinutes: appointment.durationMinutes || service.durationMinutes,
      priceEtb: appointment.priceEtb,
      startTime: appointment.startTime,
      cancellationToken: appointment.cancellationToken,
    }).catch((err) => console.error("Background notification dispatch failed:", err));

    return NextResponse.json({
      success: true,
      message: "Appointment booked successfully!",
      appointment,
    });
  } catch (error: any) {
    console.error("Booking creation error:", error);
    if (error instanceof DoubleBookingError || error.message?.includes("no longer available")) {
      return NextResponse.json(
        { error: "This time slot is no longer available. Please select another slot." },
        { status: 409 }
      );
    }
    if (error.message?.includes("screenshot has already been used")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to create booking" },
      { status: 500 }
    );
  }
}

