import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getAppointmentByToken,
  rescheduleAppointmentByToken,
} from "@/lib/data-store";
import { createAddisDateTime } from "@/lib/date-utils";
import { sendBookingConfirmationEmail } from "@/lib/notifications/email";
import { sendTelegramMessage } from "@/lib/notifications/telegram";
import { formatDualDate } from "@/lib/ethiopian-calendar";
import { minutesTo12HourString } from "@/lib/date-utils";

const rescheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:mm"),
  barberId: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const parsed = rescheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reschedule request", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { date: dateStr, time: timeStr, barberId } = parsed.data;

    const existingAppt = await getAppointmentByToken(token);
    if (!existingAppt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const newStartTime = createAddisDateTime(dateStr, timeStr);
    const duration = existingAppt.durationMinutes || 40;
    const newEndTime = new Date(
      newStartTime.getTime() + duration * 60 * 1000
    );

    const updatedAppt = await rescheduleAppointmentByToken(
      token,
      newStartTime,
      newEndTime,
      barberId
    );

    // Dispatch update notifications
    const dual = formatDualDate(newStartTime);
    const timeMin = newStartTime.getHours() * 60 + newStartTime.getMinutes();
    const timeDisplay = minutesTo12HourString(timeMin);

    const alertMsg = `
🔄 <b>Appointment Rescheduled</b>

🔖 <b>Ref:</b> <code>${updatedAppt.bookingReference}</code>
👤 <b>Customer:</b> ${updatedAppt.customerName} (${updatedAppt.customerPhone})
💈 <b>Barber:</b> ${updatedAppt.barberName}
✂️ <b>Service:</b> ${updatedAppt.serviceName}
📅 <b>New Date & Time:</b> ${dual.gregorianFormatted} at ${timeDisplay}
🇪🇹 <b>Ethio Date:</b> ${dual.ethiopianFormatted}
`.trim();

    sendTelegramMessage(
      process.env.TELEGRAM_SHOP_CHAT_ID || "shop-admin-chat",
      alertMsg
    ).catch((e) => console.error(e));

    if (updatedAppt.customerEmail) {
      sendBookingConfirmationEmail({
        bookingReference: updatedAppt.bookingReference,
        customerName: updatedAppt.customerName || existingAppt.customerName || "Customer",
        customerPhone: updatedAppt.customerPhone || existingAppt.customerPhone || "",
        customerEmail: updatedAppt.customerEmail,
        barberName: updatedAppt.barberName || "Barber",
        serviceName: updatedAppt.serviceName || "Service",
        durationMinutes: updatedAppt.durationMinutes || 40,
        priceEtb: updatedAppt.priceEtb,
        startTime: updatedAppt.startTime,
        cancellationToken: updatedAppt.cancellationToken,
      }).catch((e) => console.error(e));
    }

    return NextResponse.json({
      success: true,
      message: "Appointment rescheduled successfully!",
      appointment: updatedAppt,
    });
  } catch (error: any) {
    console.error("Reschedule API error:", error);
    const isCutoff = error.message?.includes("2 hours");
    const isConflict = error.message?.includes("no longer available");
    return NextResponse.json(
      { error: error.message || "Failed to reschedule appointment" },
      { status: isCutoff || isConflict ? 400 : 500 }
    );
  }
}

