import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getBarberById,
  getServiceById,
  inMemoryAppointments,
  AppointmentData,
  checkPrismaAvailable,
  saveStoredAppointments,
} from "@/lib/data-store";
import { validateEthiopianPhone } from "@/lib/phone";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

function dayBounds(dateStr: string): { start: Date; end: Date } {
  // dateStr: "YYYY-MM-DD" in Addis Ababa local time (UTC+3)
  const start = new Date(`${dateStr}T00:00:00+03:00`);
  const end = new Date(`${dateStr}T23:59:59+03:00`);
  return { start, end };
}

// GET /api/admin/appointments?date=YYYY-MM-DD&barberId=xxx&status=BOOKED
export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const barberId = searchParams.get("barberId");
  const status = searchParams.get("status");

  const filterByDate = Boolean(date && date !== "all");
  const { start, end } = filterByDate
    ? dayBounds(date as string)
    : { start: new Date(0), end: new Date(0) };

  let all: AppointmentData[] = [];

  const inMemoryAppts = inMemoryAppointments.filter((a) => {
    const matchBarber = !barberId || a.barberId === barberId;
    const matchStatus = !status || a.status === status;
    const matchDate =
      !filterByDate ||
      (new Date(a.startTime) >= start && new Date(a.startTime) <= end);
    return matchBarber && matchStatus && matchDate;
  });

  for (const a of inMemoryAppts) {
    const barber = await getBarberById(a.barberId);
    const service = await getServiceById(a.serviceId);
    all.push({
      ...a,
      barberName: barber?.name || a.barberName || "Unknown Barber",
      barberColor: barber?.color || "#ff9800",
      serviceName: service?.name || a.serviceName || "Unknown Service",
      durationMinutes: service?.durationMinutes || a.durationMinutes || 0,
    });
  }

  if (await checkPrismaAvailable()) {
    try {
      const whereClause: any = {};
      if (status) whereClause.status = status;
      if (barberId) whereClause.barberId = barberId;
      if (filterByDate) {
        whereClause.startTime = { gte: start, lte: end };
      }

      const dbAppointments = await prisma.appointment.findMany({
        where: whereClause,
        include: { customer: true, barber: true, service: true },
      });

      const existingIds = new Set(all.map((a) => a.id));
      for (const a of dbAppointments) {
        if (!existingIds.has(a.id)) {
          all.push({
            id: a.id,
            bookingReference: a.bookingReference,
            customerId: a.customerId,
            customerName: a.customer.name,
            customerPhone: a.customer.phone,
            customerEmail: a.customer.email,
            telegramChatId: a.customer.telegramChatId,
            barberId: a.barberId,
            barberName: a.barber.name,
            barberColor: "#ff9800",
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
      console.error("Failed to fetch appointments from database:", err);
    }
  }

  // Sort by time
  all.sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return NextResponse.json({ appointments: all, date: date || "all" });
}

const WalkInSchema = z.object({
  barberId: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
  isWalkIn: z.boolean().optional().default(false),
});

// POST /api/admin/appointments — manual booking or walk-in
export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = WalkInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (!validateEthiopianPhone(data.customerPhone)) {
      return NextResponse.json(
        { error: "Invalid Ethiopian phone number" },
        { status: 400 }
      );
    }

    const service = await getServiceById(data.serviceId);
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const barber = await getBarberById(data.barberId);
    if (!barber) {
      return NextResponse.json({ error: "Barber not found" }, { status: 404 });
    }

    // Build Date objects from date + time strings in Addis time (UTC+3)
    const startTime = new Date(`${data.date}T${data.startTime}:00+03:00`);
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60_000);

    // For walk-ins skip conflict check; for manual admin bookings still check
    if (!data.isWalkIn) {
      const conflict = inMemoryAppointments.find(
        (a) =>
          a.barberId === data.barberId &&
          a.status === "BOOKED" &&
          new Date(a.startTime) < endTime &&
          new Date(a.endTime) > startTime
      );
      if (conflict) {
        return NextResponse.json(
          { error: "Time slot conflict — choose a different time" },
          { status: 409 }
        );
      }

      if (await checkPrismaAvailable()) {
        try {
          const dbConflict = await prisma.appointment.findFirst({
            where: {
              barberId: data.barberId,
              status: "BOOKED",
              startTime: { lt: endTime },
              endTime: { gt: startTime },
            },
          });
          if (dbConflict) {
            return NextResponse.json(
              { error: "Time slot conflict — choose a different time" },
              { status: 409 }
            );
          }
        } catch (err) {
          console.error("Failed to check appointment conflicts in database:", err);
        }
      }
    }

    const bookingReference = `ARB-${Math.floor(1000 + Math.random() * 9000)}`;
    const cancellationToken = `tok_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    const notesText = data.notes
      ? `${data.isWalkIn ? "[Walk-in] " : "[Admin] "}${data.notes}`
      : data.isWalkIn
      ? "[Walk-in]"
      : "[Admin booking]";

    // Persist to Postgres when available so the booking survives restarts
    // and is visible to every instance of the app.
    if (await checkPrismaAvailable()) {
      try {
        let customer = await prisma.customer.findFirst({
          where: { phone: data.customerPhone },
        });
        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              name: data.customerName,
              phone: data.customerPhone,
              email: data.customerEmail || null,
            },
          });
        }

        const created = await prisma.appointment.create({
          data: {
            bookingReference,
            cancellationToken,
            customerId: customer.id,
            barberId: barber.id,
            serviceId: service.id,
            startTime,
            endTime,
            priceEtb: service.priceEtb,
            notes: notesText,
            status: "BOOKED",
          },
          include: { customer: true, barber: true, service: true },
        });

        console.log("Admin created new appointment (db):", created.bookingReference, customer.name);
        return NextResponse.json(
          {
            appointment: {
              id: created.id,
              bookingReference: created.bookingReference,
              customerId: created.customerId,
              customerName: created.customer.name,
              customerPhone: created.customer.phone,
              customerEmail: created.customer.email,
              barberId: created.barberId,
              barberName: created.barber.name,
              serviceId: created.serviceId,
              serviceName: created.service.name,
              durationMinutes: created.service.durationMinutes,
              startTime: created.startTime,
              endTime: created.endTime,
              status: created.status,
              priceEtb: created.priceEtb,
              notes: created.notes,
              cancellationToken: created.cancellationToken,
              createdAt: created.createdAt,
              updatedAt: created.updatedAt,
            },
          },
          { status: 201 }
        );
      } catch (err) {
        console.error("Failed to persist admin booking to database, using memory fallback:", err);
      }
    }

    const newAppt: AppointmentData = {
      id: `appt-${Date.now()}`,
      bookingReference,
      customerId: `cust-${Date.now()}`,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail || null,
      telegramChatId: null,
      barberId: barber.id,
      barberName: barber.name,
      serviceId: service.id,
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      startTime,
      endTime,
      status: "BOOKED",
      priceEtb: service.priceEtb,
      notes: notesText,
      cancellationToken,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    inMemoryAppointments.push(newAppt);
    saveStoredAppointments();
    console.log("Admin created new appointment (memory):", newAppt.bookingReference, newAppt.customerName);

    return NextResponse.json({ appointment: newAppt }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Booking failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
