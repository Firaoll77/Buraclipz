import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatch24HourReminder } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Verify secret if set in production
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    // 24 hours from now (+/- 1 hour window: 23h to 25h from now)
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    let eligibleAppointments: any[] = [];

    try {
      eligibleAppointments = await prisma.appointment.findMany({
        where: {
          status: "BOOKED",
          reminderSent24h: false,
          startTime: {
            gte: windowStart,
            lte: windowEnd,
          },
        },
        include: {
          customer: true,
          barber: true,
          service: true,
        },
      });
    } catch {
      // Prisma not connected or in-memory fallback
      eligibleAppointments = [];
    }

    const reminderResults = [];

    for (const appt of eligibleAppointments) {
      const results = await dispatch24HourReminder({
        id: appt.id,
        bookingReference: appt.bookingReference,
        customerName: appt.customer.name,
        customerPhone: appt.customer.phone,
        customerEmail: appt.customer.email,
        telegramChatId: appt.customer.telegramChatId,
        barberName: appt.barber.name,
        serviceName: appt.service.name,
        durationMinutes: appt.service.durationMinutes,
        priceEtb: appt.priceEtb,
        startTime: appt.startTime,
        cancellationToken: appt.cancellationToken,
      });

      // Mark reminderSent24h = true in DB
      try {
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { reminderSent24h: true },
        });
      } catch (err) {
        console.error("Failed to update reminderSent24h flag:", err);
      }

      reminderResults.push({
        bookingReference: appt.bookingReference,
        results,
      });
    }

    return NextResponse.json({
      success: true,
      processedCount: eligibleAppointments.length,
      window: {
        from: windowStart.toISOString(),
        to: windowEnd.toISOString(),
      },
      reminders: reminderResults,
    });
  } catch (error: any) {
    console.error("Cron Reminder Job Error:", error);
    return NextResponse.json(
      { error: "Failed to process reminders", message: error.message },
      { status: 500 }
    );
  }
}

// Allow POST as well
export async function POST(request: NextRequest) {
  return GET(request);
}

