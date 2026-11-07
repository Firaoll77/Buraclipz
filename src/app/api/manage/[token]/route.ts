import { NextRequest, NextResponse } from "next/server";
import { getAppointmentByToken } from "@/lib/data-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const appointment = await getAppointmentByToken(token);

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found. Please verify your link." },
        { status: 404 }
      );
    }

    const now = new Date();
    const apptTime = new Date(appointment.startTime);
    const msRemaining = apptTime.getTime() - now.getTime();
    const hoursRemaining = msRemaining / (1000 * 60 * 60);

    // 2-hour cutoff rule: canModify is true only if appointment is >= 2 hours away and not CANCELLED/COMPLETED
    const canModify = hoursRemaining >= 2 && appointment.status === "BOOKED";

    return NextResponse.json({
      appointment,
      cutoff: {
        canModify,
        hoursRemaining: Math.max(0, Number(hoursRemaining.toFixed(1))),
        cutoffHours: 2,
        isPast: msRemaining < 0,
      },
    });
  } catch (error: any) {
    console.error("Manage GET error:", error);
    return NextResponse.json(
      { error: "Failed to load appointment details", message: error.message },
      { status: 500 }
    );
  }
}

