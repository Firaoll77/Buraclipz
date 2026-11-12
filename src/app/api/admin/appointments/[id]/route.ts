import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  inMemoryAppointments,
  saveStoredAppointments,
  checkPrismaAvailable,
} from "@/lib/data-store";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["BOOKED", "COMPLETED", "CANCELLED"] as const;
type AppointmentStatus = (typeof VALID_STATUSES)[number];

const APPOINTMENT_INCLUDE = {
  customer: true,
  barber: true,
  service: true,
} as const;

function toAppointmentData(a: any) {
  return {
    id: a.id,
    bookingReference: a.bookingReference,
    customerId: a.customerId,
    customerName: a.customer?.name,
    customerPhone: a.customer?.phone,
    customerEmail: a.customer?.email ?? null,
    telegramChatId: a.customer?.telegramChatId ?? null,
    barberId: a.barberId,
    barberName: a.barber?.name,
    serviceId: a.serviceId,
    serviceName: a.service?.name,
    durationMinutes: a.service?.durationMinutes,
    startTime: a.startTime,
    endTime: a.endTime,
    status: a.status,
    priceEtb: a.priceEtb,
    notes: a.notes,
    cancellationToken: a.cancellationToken,
    cancellationReason: a.cancellationReason,
    cancelledAt: a.cancelledAt,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    paymentScreenshot: a.paymentScreenshot,
  };
}

// PATCH /api/admin/appointments/[id] — update status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status } = body as { status?: string };

  if (!status || !VALID_STATUSES.includes(status as AppointmentStatus)) {
    return NextResponse.json(
      { error: `Status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const newStatus = status as AppointmentStatus;

  // Database-backed appointments (real customer bookings)
  if (await checkPrismaAvailable()) {
    try {
      const existing = await prisma.appointment.findUnique({ where: { id } });
      if (existing) {
        const updated = await prisma.appointment.update({
          where: { id },
          data: { status: newStatus },
          include: APPOINTMENT_INCLUDE,
        });

        // Keep the in-memory mirror in sync if a copy exists
        const mem = inMemoryAppointments.find((a) => a.id === id);
        if (mem) {
          mem.status = newStatus;
          saveStoredAppointments();
        }

        return NextResponse.json({ appointment: toAppointmentData(updated) });
      }
    } catch (err) {
      console.error("Failed to update appointment status in database:", err);
    }
  }

  // In-memory fallback (demo bookings, admin-created bookings when DB is down)
  const appt = inMemoryAppointments.find((a) => a.id === id);
  if (!appt) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  appt.status = newStatus;
  saveStoredAppointments();

  return NextResponse.json({ appointment: appt });
}

// DELETE /api/admin/appointments/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (await checkPrismaAvailable()) {
    try {
      await prisma.appointment.delete({ where: { id } });
      const memIdx = inMemoryAppointments.findIndex((a) => a.id === id);
      if (memIdx !== -1) {
        inMemoryAppointments.splice(memIdx, 1);
        saveStoredAppointments();
      }
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      if (err?.code !== "P2025") {
        console.error("Failed to delete appointment from database:", err);
      }
      // P2025 = record not found → fall through to memory lookup
    }
  }

  const idx = inMemoryAppointments.findIndex((a) => a.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  inMemoryAppointments.splice(idx, 1);
  saveStoredAppointments();
  return NextResponse.json({ ok: true });
}
