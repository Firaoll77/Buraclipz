import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getAllServices,
  getAllBarbers,
  getBarberAppointmentsForDay,
  AppointmentData,
} from "@/lib/data-store";
import { getAddisDateString } from "@/lib/date-utils";

function dayBounds(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00+03:00`);
  const end = new Date(`${dateStr}T23:59:59+03:00`);
  return { start, end };
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStr = getAddisDateString(new Date());
  const { start, end } = dayBounds(todayStr);

  const [barbers, services] = await Promise.all([
    getAllBarbers(),
    getAllServices(),
  ]);

  // Get today's appointments for all barbers
  const appointmentsByBarber = await Promise.all(
    barbers.map(async (b) => {
      const appts = await getBarberAppointmentsForDay(b.id, start, end);
      return { barberId: b.id, barberName: b.name, appointments: appts as AppointmentData[] };
    })
  );

  const allToday = appointmentsByBarber.flatMap((b) =>
    b.appointments.map((a) => ({ ...a, barberName: b.barberName }))
  );

  const stats = {
    todayTotal: allToday.length,
    todayBooked: allToday.filter((a) => a.status === "BOOKED").length,
    todayCompleted: allToday.filter((a) => a.status === "COMPLETED").length,
    todayCancelled: allToday.filter((a) => a.status === "CANCELLED").length,
    totalBarbers: barbers.length,
    totalServices: services.length,
  };

  return NextResponse.json({ stats, today: allToday, barbers, services });
}
