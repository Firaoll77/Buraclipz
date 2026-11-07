import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { inMemoryAppointments, saveStoredAppointments } from "@/lib/data-store";

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

  const validStatuses = ["BOOKED", "COMPLETED", "CANCELLED"];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Status must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  const appt = inMemoryAppointments.find((a) => a.id === id);
  if (!appt) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  appt.status = status as "BOOKED" | "COMPLETED" | "CANCELLED";
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

  const idx = inMemoryAppointments.findIndex((a) => a.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  inMemoryAppointments.splice(idx, 1);
  saveStoredAppointments();
  return NextResponse.json({ ok: true });
}
