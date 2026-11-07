import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getServiceById,
  getAllBarbers,
  getBarberById,
  getBarberWorkingHours,
  getBarberAppointmentsForDay,
  getBarberTimeOff,
} from "@/lib/data-store";
import {
  calculateBarberDaySlots,
  mergeBarberSlots,
  SlotResult,
} from "@/lib/availability";
import {
  getDayOfWeekFromDateString,
  createAddisDateTime,
  getAddisDateString,
} from "@/lib/date-utils";

const querySchema = z.object({
  serviceId: z.string().min(1, "Service ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  barberId: z.string().optional().default("any"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      serviceId: searchParams.get("serviceId"),
      date: searchParams.get("date"),
      barberId: searchParams.get("barberId") || "any",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { serviceId, date: dateStr, barberId } = parsed.data;

    // 1. Fetch Service to get duration
    const service = await getServiceById(serviceId);
    if (!service || !service.isActive) {
      return NextResponse.json(
        { error: "Service not found or inactive" },
        { status: 404 }
      );
    }

    const dayOfWeek = getDayOfWeekFromDateString(dateStr);
    const dayStart = createAddisDateTime(dateStr, "00:00");
    const dayEnd = createAddisDateTime(dateStr, "23:59");

    // Fetch configured time slots for this barber and day
    async function getConfiguredSlots(barberId: string, dayOfWeek: number) {
      try {
        const timeSlotConfigs = await prisma.timeSlotConfig.findMany({
          where: {
            barberId,
            dayOfWeek,
            isActive: true,
          },
          orderBy: { slotStart: "asc" },
        });
        return timeSlotConfigs;
      } catch (error) {
        // If database not available, return empty (will fall back to working hours)
        return [];
      }
    }

    // 2. Specific Barber
    if (barberId !== "any") {
      const barber = await getBarberById(barberId);
      if (!barber || !barber.isActive) {
        return NextResponse.json(
          { error: "Barber not found or inactive" },
          { status: 404 }
        );
      }

      const workingHours = await getBarberWorkingHours(barber.id, dayOfWeek);
      const appointments = await getBarberAppointmentsForDay(barber.id, dayStart, dayEnd);
      const timeOffs = await getBarberTimeOff(barber.id, dayStart, dayEnd);
      const configuredSlots = await getConfiguredSlots(barber.id, dayOfWeek);

      // If admin has configured specific slots, use those; otherwise use working hours
      const useConfiguredSlots = configuredSlots.length > 0;

      let slots: SlotResult[];
      if (useConfiguredSlots) {
        // Generate slots from configured time slot configs
        slots = [];
        for (const config of configuredSlots) {
          const configStart = config.slotStart;
          const configEnd = config.slotEnd;
          const startMinutes = parseInt(configStart.split(":")[0]) * 60 + parseInt(configStart.split(":")[1]);
          const endMinutes = parseInt(configEnd.split(":")[0]) * 60 + parseInt(configEnd.split(":")[1]);

          // Generate slots within this configured window
          for (
            let slotStart = startMinutes;
            slotStart + service.durationMinutes <= endMinutes;
            slotStart += 15
          ) {
            const slotEnd = slotStart + service.durationMinutes;

            // Check against existing appointments and time off
            const slotTimeStr = `${Math.floor(slotStart / 60).toString().padStart(2, "0")}:${(slotStart % 60).toString().padStart(2, "0")}`;
            const slotDateTime = createAddisDateTime(dateStr, slotTimeStr);
            const slotEndDateTime = createAddisDateTime(dateStr, `${Math.floor(slotEnd / 60).toString().padStart(2, "0")}:${(slotEnd % 60).toString().padStart(2, "0")}`);

            // Check time off overlap
            let overlapsTimeOff = false;
            for (const off of timeOffs) {
              const offStart = typeof off.startDate === "string" ? new Date(off.startDate) : off.startDate;
              const offEnd = typeof off.endDate === "string" ? new Date(off.endDate) : off.endDate;
              if (slotDateTime < offEnd && slotEndDateTime > offStart) {
                overlapsTimeOff = true;
                break;
              }
            }
            if (overlapsTimeOff) continue;

            // Check appointment overlap
            let conflictsWithAppointment = false;
            for (const appt of appointments) {
              if (appt.status === "CANCELLED") continue;
              const apptStart = typeof appt.startTime === "string" ? new Date(appt.startTime) : appt.startTime;
              const apptEnd = typeof appt.endTime === "string" ? new Date(appt.endTime) : appt.endTime;
              if (slotDateTime < apptEnd && slotEndDateTime > apptStart) {
                conflictsWithAppointment = true;
                break;
              }
            }
            if (conflictsWithAppointment) continue;

            // Check past time cutoff for today
            const nowInAddis = new Date();
            const todayStr = getAddisDateString(nowInAddis);
            const isToday = dateStr === todayStr;
            if (isToday && slotStart < nowInAddis.getHours() * 60 + nowInAddis.getMinutes() + 30) {
              continue;
            }

            slots.push({
              timeStr: slotTimeStr,
              displayTime: `${Math.floor(slotStart / 60) % 12 || 12}:${(slotStart % 60).toString().padStart(2, "0")} ${slotStart >= 720 ? "PM" : "AM"}`,
              startMinutes: slotStart,
              endMinutes: slotEnd,
              dateStr: dateStr,
              startTimeIso: slotDateTime.toISOString(),
              endTimeIso: slotEndDateTime.toISOString(),
              barberId: barber.id,
              barberName: barber.name,
            });
          }
        }
      } else {
        // Use working hours as before
        slots = calculateBarberDaySlots({
          targetDateStr: dateStr,
          barberId: barber.id,
          barberName: barber.name,
          serviceDurationMinutes: service.durationMinutes,
          bufferMinutes: 10,
          slotIntervalMinutes: 15,
          workingHours,
          existingAppointments: appointments,
          timeOffs,
        });
      }

      return NextResponse.json({
        date: dateStr,
        service: {
          id: service.id,
          name: service.name,
          durationMinutes: service.durationMinutes,
          priceEtb: service.priceEtb,
        },
        barber: {
          id: barber.id,
          name: barber.name,
        },
        slots,
      });
    }

    // 3. "Any Available" Barber
    const barbers = await getAllBarbers();
    const barberSlotMap = new Map<string, { barberName: string; slots: SlotResult[] }>();

    for (const barber of barbers) {
      if (!barber.isActive) continue;

      const workingHours = await getBarberWorkingHours(barber.id, dayOfWeek);
      const appointments = await getBarberAppointmentsForDay(barber.id, dayStart, dayEnd);
      const timeOffs = await getBarberTimeOff(barber.id, dayStart, dayEnd);
      const configuredSlots = await getConfiguredSlots(barber.id, dayOfWeek);

      const useConfiguredSlots = configuredSlots.length > 0;

      let slots: SlotResult[];
      if (useConfiguredSlots) {
        slots = [];
        for (const config of configuredSlots) {
          const configStart = config.slotStart;
          const configEnd = config.slotEnd;
          const startMinutes = parseInt(configStart.split(":")[0]) * 60 + parseInt(configStart.split(":")[1]);
          const endMinutes = parseInt(configEnd.split(":")[0]) * 60 + parseInt(configEnd.split(":")[1]);

          for (
            let slotStart = startMinutes;
            slotStart + service.durationMinutes <= endMinutes;
            slotStart += 15
          ) {
            const slotEnd = slotStart + service.durationMinutes;
            const slotTimeStr = `${Math.floor(slotStart / 60).toString().padStart(2, "0")}:${(slotStart % 60).toString().padStart(2, "0")}`;
            const slotDateTime = createAddisDateTime(dateStr, slotTimeStr);
            const slotEndDateTime = createAddisDateTime(dateStr, `${Math.floor(slotEnd / 60).toString().padStart(2, "0")}:${(slotEnd % 60).toString().padStart(2, "0")}`);

            let overlapsTimeOff = false;
            for (const off of timeOffs) {
              const offStart = typeof off.startDate === "string" ? new Date(off.startDate) : off.startDate;
              const offEnd = typeof off.endDate === "string" ? new Date(off.endDate) : off.endDate;
              if (slotDateTime < offEnd && slotEndDateTime > offStart) {
                overlapsTimeOff = true;
                break;
              }
            }
            if (overlapsTimeOff) continue;

            let conflictsWithAppointment = false;
            for (const appt of appointments) {
              if (appt.status === "CANCELLED") continue;
              const apptStart = typeof appt.startTime === "string" ? new Date(appt.startTime) : appt.startTime;
              const apptEnd = typeof appt.endTime === "string" ? new Date(appt.endTime) : appt.endTime;
              if (slotDateTime < apptEnd && slotEndDateTime > apptStart) {
                conflictsWithAppointment = true;
                break;
              }
            }
            if (conflictsWithAppointment) continue;

            const nowInAddis = new Date();
            const todayStr = getAddisDateString(nowInAddis);
            const isToday = dateStr === todayStr;
            if (isToday && slotStart < nowInAddis.getHours() * 60 + nowInAddis.getMinutes() + 30) {
              continue;
            }

            slots.push({
              timeStr: slotTimeStr,
              displayTime: `${Math.floor(slotStart / 60) % 12 || 12}:${(slotStart % 60).toString().padStart(2, "0")} ${slotStart >= 720 ? "PM" : "AM"}`,
              startMinutes: slotStart,
              endMinutes: slotEnd,
              dateStr: dateStr,
              startTimeIso: slotDateTime.toISOString(),
              endTimeIso: slotEndDateTime.toISOString(),
              barberId: barber.id,
              barberName: barber.name,
            });
          }
        }
      } else {
        slots = calculateBarberDaySlots({
          targetDateStr: dateStr,
          barberId: barber.id,
          barberName: barber.name,
          serviceDurationMinutes: service.durationMinutes,
          bufferMinutes: 10,
          slotIntervalMinutes: 15,
          workingHours,
          existingAppointments: appointments,
          timeOffs,
        });
      }

      barberSlotMap.set(barber.id, {
        barberName: barber.name,
        slots,
      });
    }

    const mergedSlots = mergeBarberSlots(barberSlotMap);

    return NextResponse.json({
      date: dateStr,
      service: {
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        priceEtb: service.priceEtb,
      },
      barber: {
        id: "any",
        name: "Any Available Barber",
      },
      slots: mergedSlots,
    });
  } catch (error: any) {
    console.error("Availability API Error:", error);
    return NextResponse.json(
      { error: "Failed to calculate availability", message: error.message },
      { status: 500 }
    );
  }
}
