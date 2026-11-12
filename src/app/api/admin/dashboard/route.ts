import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getAllServices,
  getAllBarbers,
  getBarberById,
  getServiceById,
  inMemoryAppointments,
  AppointmentData,
  checkPrismaAvailable,
} from "@/lib/data-store";
import { getAddisDateString } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

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

  let allToday: AppointmentData[] = [];

  // In-memory appointments (demo data, fallback-mode bookings)
  const inMemoryToday = inMemoryAppointments.filter((a) => {
    const t = new Date(a.startTime);
    return t >= start && t <= end;
  });

  for (const a of inMemoryToday) {
    const barber = await getBarberById(a.barberId);
    const service = await getServiceById(a.serviceId);
    allToday.push({
      ...a,
      barberName: barber?.name || a.barberName || "Unknown Barber",
      serviceName: service?.name || a.serviceName || "Unknown Service",
      durationMinutes: service?.durationMinutes || a.durationMinutes || 0,
    });
  }

  // Database appointments — include customer so name/phone are populated
  if (await checkPrismaAvailable()) {
    try {
      const dbAppointments = await prisma.appointment.findMany({
        where: {
          startTime: { gte: start, lte: end },
        },
        include: { customer: true, barber: true, service: true },
        orderBy: { startTime: "asc" },
      });

      const existingIds = new Set(allToday.map((a) => a.id));
      for (const a of dbAppointments) {
        if (!existingIds.has(a.id)) {
          allToday.push({
            id: a.id,
            bookingReference: a.bookingReference,
            customerId: a.customerId,
            customerName: a.customer.name,
            customerPhone: a.customer.phone,
            customerEmail: a.customer.email,
            telegramChatId: a.customer.telegramChatId,
            barberId: a.barberId,
            barberName: a.barber.name,
            serviceId: a.serviceId,
            serviceName: a.service.name,
            durationMinutes: a.service.durationMinutes,
            startTime: a.startTime,
            endTime: a.endTime,
            status: a.status as "BOOKED" | "CANCELLED" | "COMPLETED",
            priceEtb: a.priceEtb,
            notes: a.notes,
            cancellationToken: a.cancellationToken,
            cancellationReason: a.cancellationReason,
            cancelledAt: a.cancelledAt,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
            paymentScreenshot: a.paymentScreenshot,
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch today's appointments from database:", err);
    }
  }

  allToday.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
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
