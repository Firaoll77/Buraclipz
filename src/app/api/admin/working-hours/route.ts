import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getBarberWorkingHours, WorkingHoursData } from "@/lib/data-store";
import { getAllBarbers } from "@/lib/data-store";
import { z } from "zod";

// In-memory working hours overrides
const workingHoursOverrides: Map<string, WorkingHoursData> = new Map();

function makeKey(barberId: string, dayOfWeek: number) {
  return `${barberId}:${dayOfWeek}`;
}

// GET /api/admin/working-hours?barberId=xxx
export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const barberId = searchParams.get("barberId");

  const barbers = await getAllBarbers();
  const targetBarbers = barberId
    ? barbers.filter((b) => b.id === barberId)
    : barbers;

  const results: WorkingHoursData[] = [];
  for (const b of targetBarbers) {
    for (let day = 0; day <= 6; day++) {
      const override = workingHoursOverrides.get(makeKey(b.id, day));
      if (override) {
        results.push(override);
      } else {
        const wh = await getBarberWorkingHours(b.id, day);
        if (wh) results.push(wh);
      }
    }
  }

  return NextResponse.json({ workingHours: results });
}

const WorkingHoursSchema = z.object({
  barberId: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  isOpen: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  breakStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  breakEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
});

// PUT /api/admin/working-hours — upsert a barber+day combo
export async function PUT(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = WorkingHoursSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const existing = await getBarberWorkingHours(data.barberId, data.dayOfWeek);
    const updated: WorkingHoursData = {
      id: existing?.id || `wh-${data.barberId}-${data.dayOfWeek}-${Date.now()}`,
      barberId: data.barberId,
      dayOfWeek: data.dayOfWeek,
      isOpen: data.isOpen,
      startTime: data.startTime,
      endTime: data.endTime,
      breakStartTime: data.breakStartTime ?? null,
      breakEndTime: data.breakEndTime ?? null,
    };

    workingHoursOverrides.set(makeKey(data.barberId, data.dayOfWeek), updated);
    return NextResponse.json({ workingHours: updated });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

