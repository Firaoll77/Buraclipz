/**
 * Core Availability Engine for Addis Ababa Barbershop
 * 
 * Rules:
 * Available Slots = Barber Working Hours 
 *                  - Breaks 
 *                  - Time Off 
 *                  - Existing Booked Appointments (with Buffer)
 *                  - Past Time Cutoff (for today)
 */

import {
  timeStringToMinutes,
  minutesToTimeString,
  minutesTo12HourString,
  createAddisDateTime,
  getAddisDateString,
  getNowInAddis,
  getDayOfWeekFromDateString,
} from "./date-utils";

export interface WorkingHoursInput {
  isOpen: boolean;
  startTime: string;      // e.g. "09:00"
  endTime: string;        // e.g. "20:00"
  breakStartTime?: string | null; // e.g. "13:00"
  breakEndTime?: string | null;   // e.g. "14:00"
}

export interface ExistingAppointmentInput {
  id?: string;
  startTime: Date | string;
  endTime: Date | string;
  status?: string;
}

export interface TimeOffInput {
  id?: string;
  startDate: Date | string;
  endDate: Date | string;
  reason?: string | null;
}

export interface CalculateSlotsOptions {
  targetDateStr: string;               // "YYYY-MM-DD"
  workingHours?: WorkingHoursInput | null;
  existingAppointments: ExistingAppointmentInput[];
  timeOffs?: TimeOffInput[];
  serviceDurationMinutes: number;     // e.g. 40
  bufferMinutes?: number;              // default: 10 minutes
  slotIntervalMinutes?: number;        // default: 15 minutes (or 30)
  minLeadTimeMinutes?: number;         // minimum notice for booking today, default 30 min
  nowInAddis?: Date;                   // optional injectable for deterministic testing
  barberId: string;
  barberName?: string;
}

export interface SlotResult {
  timeStr: string;         // "09:00"
  displayTime: string;     // "09:00 AM"
  startMinutes: number;
  endMinutes: number;
  dateStr: string;         // "YYYY-MM-DD"
  startTimeIso: string;    // ISO timestamp with +03:00
  endTimeIso: string;      // ISO timestamp with +03:00
  barberId: string;
  barberName?: string;
}

/**
 * Pure calculation function: determines all valid appointment start slots
 * for a specific barber on a given day.
 */
export function calculateBarberDaySlots(options: CalculateSlotsOptions): SlotResult[] {
  const {
    targetDateStr,
    workingHours,
    existingAppointments = [],
    timeOffs = [],
    serviceDurationMinutes,
    bufferMinutes = 10,
    slotIntervalMinutes = 15,
    minLeadTimeMinutes = 30,
    nowInAddis = getNowInAddis(),
    barberId,
    barberName,
  } = options;

  // 1. If no working hours or barber is marked closed/day off, return empty
  if (!workingHours || !workingHours.isOpen) {
    return [];
  }

  const workStartMinutes = timeStringToMinutes(workingHours.startTime);
  const workEndMinutes = timeStringToMinutes(workingHours.endTime);

  // If invalid working hours configuration
  if (workStartMinutes >= workEndMinutes) {
    return [];
  }

  // Parse break interval if present
  let hasBreak = false;
  let breakStart = -1;
  let breakEnd = -1;
  if (workingHours.breakStartTime && workingHours.breakEndTime) {
    breakStart = timeStringToMinutes(workingHours.breakStartTime);
    breakEnd = timeStringToMinutes(workingHours.breakEndTime);
    if (breakStart < breakEnd) {
      hasBreak = true;
    }
  }

  // 2. Normalize existing booked appointments to minutes intervals on targetDate
  // Filter only active/booked appointments (ignore cancelled)
  const appointmentIntervals: Array<{ start: number; end: number }> = [];

  for (const appt of existingAppointments) {
    if (appt.status && appt.status === "CANCELLED") continue;

    const apptStart = typeof appt.startTime === "string" ? new Date(appt.startTime) : appt.startTime;
    const apptEnd = typeof appt.endTime === "string" ? new Date(appt.endTime) : appt.endTime;

    const apptDateStr = getAddisDateString(apptStart);
    if (apptDateStr === targetDateStr) {
      // Calculate start and end minutes from midnight in Addis time
      const startMin = apptStart.getHours() * 60 + apptStart.getMinutes();
      const endMin = apptEnd.getHours() * 60 + apptEnd.getMinutes();
      appointmentIntervals.push({ start: startMin, end: endMin });
    }
  }

  // 3. Normalize Time Off records for targetDate
  const timeOffIntervals: Array<{ start: number; end: number }> = [];

  for (const off of timeOffs) {
    const offStart = typeof off.startDate === "string" ? new Date(off.startDate) : off.startDate;
    const offEnd = typeof off.endDate === "string" ? new Date(off.endDate) : off.endDate;

    const dayStart = createAddisDateTime(targetDateStr, "00:00");
    const dayEnd = createAddisDateTime(targetDateStr, "23:59");

    // Check if the time off overlaps with this target date
    if (offStart <= dayEnd && offEnd >= dayStart) {
      // Convert to minutes of the day clamped to [0, 1440]
      const startMin = offStart <= dayStart ? 0 : offStart.getHours() * 60 + offStart.getMinutes();
      const endMin = offEnd >= dayEnd ? 1440 : offEnd.getHours() * 60 + offEnd.getMinutes();
      timeOffIntervals.push({ start: startMin, end: endMin });
    }
  }

  // 4. Determine past time cutoff if targetDate is today in Addis Ababa
  const todayStr = getAddisDateString(nowInAddis);
  const isToday = targetDateStr === todayStr;
  const currentMinutesToday = isToday
    ? nowInAddis.getHours() * 60 + nowInAddis.getMinutes() + minLeadTimeMinutes
    : -1;

  // 5. Generate candidate slots across working hours
  const availableSlots: SlotResult[] = [];

  for (
    let slotStart = workStartMinutes;
    slotStart + serviceDurationMinutes <= workEndMinutes;
    slotStart += slotIntervalMinutes
  ) {
    const slotEnd = slotStart + serviceDurationMinutes;

    // A. Check if in past (for today)
    if (isToday && slotStart < currentMinutesToday) {
      continue;
    }

    // B. Check break overlap
    if (hasBreak) {
      // An appointment [slotStart, slotEnd] cannot overlap with break [breakStart, breakEnd]
      const overlapsBreak = Math.max(slotStart, breakStart) < Math.min(slotEnd, breakEnd);
      if (overlapsBreak) {
        continue;
      }
    }

    // C. Check time off overlap (pure overlap, no buffer added to barber leave)
    let overlapsTimeOff = false;
    for (const off of timeOffIntervals) {
      if (Math.max(slotStart, off.start) < Math.min(slotEnd, off.end)) {
        overlapsTimeOff = true;
        break;
      }
    }
    if (overlapsTimeOff) {
      continue;
    }

    // D. Check overlap with existing appointments with sanitation buffer
    let conflictsWithAppointment = false;
    for (const appt of appointmentIntervals) {
      // Slot needs [slotStart, slotEnd + bufferMinutes]
      // Existing appointment occupied [appt.start, appt.end + bufferMinutes]
      const conflict =
        slotStart < appt.end + bufferMinutes && slotEnd + bufferMinutes > appt.start;

      if (conflict) {
        conflictsWithAppointment = true;
        break;
      }
    }

    if (conflictsWithAppointment) {
      continue;
    }

    // Candidate slot is valid!
    const timeStr = minutesToTimeString(slotStart);
    const startDateTime = createAddisDateTime(targetDateStr, timeStr);
    const endDateTime = createAddisDateTime(targetDateStr, minutesToTimeString(slotEnd));

    availableSlots.push({
      timeStr,
      displayTime: minutesTo12HourString(slotStart),
      startMinutes: slotStart,
      endMinutes: slotEnd,
      dateStr: targetDateStr,
      startTimeIso: startDateTime.toISOString(),
      endTimeIso: endDateTime.toISOString(),
      barberId,
      barberName,
    });
  }

  return availableSlots;
}

/**
 * Aggregated slot for multi-barber selection ("any available" barber)
 */
export interface CombinedSlotResult {
  timeStr: string;
  displayTime: string;
  startMinutes: number;
  endMinutes: number;
  dateStr: string;
  startTimeIso: string;
  endTimeIso: string;
  availableBarbers: Array<{ id: string; name: string }>;
}

/**
 * Merges available slots from multiple barbers for a given date
 */
export function mergeBarberSlots(barberSlotMap: Map<string, { barberName: string; slots: SlotResult[] }>): CombinedSlotResult[] {
  const timeSlotMap = new Map<string, CombinedSlotResult>();

  for (const [barberId, { barberName, slots }] of barberSlotMap.entries()) {
    for (const slot of slots) {
      if (!timeSlotMap.has(slot.timeStr)) {
        timeSlotMap.set(slot.timeStr, {
          timeStr: slot.timeStr,
          displayTime: slot.displayTime,
          startMinutes: slot.startMinutes,
          endMinutes: slot.endMinutes,
          dateStr: slot.dateStr,
          startTimeIso: slot.startTimeIso,
          endTimeIso: slot.endTimeIso,
          availableBarbers: [{ id: barberId, name: barberName }],
        });
      } else {
        const existing = timeSlotMap.get(slot.timeStr)!;
        existing.availableBarbers.push({ id: barberId, name: barberName });
      }
    }
  }

  // Sort slots chronologically
  return Array.from(timeSlotMap.values()).sort((a, b) => a.startMinutes - b.startMinutes);
}
