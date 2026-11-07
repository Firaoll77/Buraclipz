import { describe, it, expect } from "vitest";
import {
  calculateBarberDaySlots,
  mergeBarberSlots,
  SlotResult,
} from "../availability";
import { createAddisDateTime } from "../date-utils";

describe("Availability Engine (slots = hours - breaks - time off - appointments + buffer)", () => {
  const targetDate = "2026-11-10"; // A Tuesday in the future

  it("should generate available slots within working hours for an empty day", () => {
    const slots = calculateBarberDaySlots({
      targetDateStr: targetDate,
      barberId: "barber-1",
      barberName: "Dawit Tadesse",
      serviceDurationMinutes: 30,
      bufferMinutes: 10,
      slotIntervalMinutes: 30,
      workingHours: {
        isOpen: true,
        startTime: "09:00",
        endTime: "12:00", // 3 hours window
      },
      existingAppointments: [],
    });

    // 09:00-09:30, 09:30-10:00, 10:00-10:30, 10:30-11:00, 11:00-11:30, 11:30-12:00
    expect(slots.length).toBe(6);
    expect(slots[0].timeStr).toBe("09:00");
    expect(slots[slots.length - 1].timeStr).toBe("11:30");
  });

  it("should return empty array if barber is closed / day off", () => {
    const slots = calculateBarberDaySlots({
      targetDateStr: targetDate,
      barberId: "barber-1",
      serviceDurationMinutes: 40,
      workingHours: {
        isOpen: false,
        startTime: "09:00",
        endTime: "19:00",
      },
      existingAppointments: [],
    });

    expect(slots).toEqual([]);
  });

  it("should exclude slots that overlap with the barber's lunch break", () => {
    const slots = calculateBarberDaySlots({
      targetDateStr: targetDate,
      barberId: "barber-1",
      serviceDurationMinutes: 40,
      bufferMinutes: 10,
      slotIntervalMinutes: 15,
      workingHours: {
        isOpen: true,
        startTime: "12:00",
        endTime: "15:00",
        breakStartTime: "13:00",
        breakEndTime: "14:00",
      },
      existingAppointments: [],
    });

    // An appointment starting at 12:30 ends at 13:10 -> overlaps with 13:00-14:00 break, must be excluded!
    const slot1230 = slots.find((s) => s.timeStr === "12:30");
    expect(slot1230).toBeUndefined();

    // An appointment starting at 12:45 ends at 13:25 -> must be excluded!
    const slot1245 = slots.find((s) => s.timeStr === "12:45");
    expect(slot1245).toBeUndefined();

    // An appointment starting at 13:15 is inside the break -> must be excluded!
    const slot1315 = slots.find((s) => s.timeStr === "13:15");
    expect(slot1315).toBeUndefined();

    // Slot at 12:00 ends at 12:40 -> valid!
    const slot1200 = slots.find((s) => s.timeStr === "12:00");
    expect(slot1200).toBeDefined();

    // Slot at 14:00 ends at 14:40 -> valid!
    const slot1400 = slots.find((s) => s.timeStr === "14:00");
    expect(slot1400).toBeDefined();
  });

  it("should exclude slots overlapping existing booked appointments and buffer time", () => {
    // Existing appointment: 10:00 to 10:40 (40 min)
    // Buffer = 10 min -> Barber is occupied from 10:00 until 10:50!
    const apptStart = createAddisDateTime(targetDate, "10:00");
    const apptEnd = createAddisDateTime(targetDate, "10:40");

    const slots = calculateBarberDaySlots({
      targetDateStr: targetDate,
      barberId: "barber-1",
      serviceDurationMinutes: 30,
      bufferMinutes: 10,
      slotIntervalMinutes: 15,
      workingHours: {
        isOpen: true,
        startTime: "09:00",
        endTime: "13:00",
      },
      existingAppointments: [
        {
          startTime: apptStart,
          endTime: apptEnd,
          status: "BOOKED",
        },
      ],
    });

    // 09:30 slot with 30m duration ends at 10:00 + 10m buffer = 10:10 -> conflicts with 10:00 start!
    const slot0930 = slots.find((s) => s.timeStr === "09:30");
    expect(slot0930).toBeUndefined();

    // 09:15 slot with 30m duration ends at 09:45 + 10m buffer = 09:55 -> finishes before 10:00 -> valid!
    const slot0915 = slots.find((s) => s.timeStr === "09:15");
    expect(slot0915).toBeDefined();

    // 10:00 slot -> directly conflicts with appointment
    const slot1000 = slots.find((s) => s.timeStr === "10:00");
    expect(slot1000).toBeUndefined();

    // 10:30 slot -> conflicts with appointment
    const slot1030 = slots.find((s) => s.timeStr === "10:30");
    expect(slot1030).toBeUndefined();

    // 10:45 slot -> conflicts with 10:40 + 10m buffer = 10:50
    const slot1045 = slots.find((s) => s.timeStr === "10:45");
    expect(slot1045).toBeUndefined();

    // 10:50 would be valid, with 15m intervals the next candidate is 11:00 -> valid!
    const slot1100 = slots.find((s) => s.timeStr === "11:00");
    expect(slot1100).toBeDefined();
  });

  it("should ignore CANCELLED appointments when calculating availability", () => {
    const apptStart = createAddisDateTime(targetDate, "10:00");
    const apptEnd = createAddisDateTime(targetDate, "10:40");

    const slots = calculateBarberDaySlots({
      targetDateStr: targetDate,
      barberId: "barber-1",
      serviceDurationMinutes: 30,
      workingHours: {
        isOpen: true,
        startTime: "09:00",
        endTime: "12:00",
      },
      existingAppointments: [
        {
          startTime: apptStart,
          endTime: apptEnd,
          status: "CANCELLED",
        },
      ],
    });

    // Slot at 10:00 should be available since the conflicting booking was cancelled
    const slot1000 = slots.find((s) => s.timeStr === "10:00");
    expect(slot1000).toBeDefined();
  });

  it("should exclude slots that fall inside barber Time Off", () => {
    // Barber takes time off from 11:00 to 14:00
    const offStart = createAddisDateTime(targetDate, "11:00");
    const offEnd = createAddisDateTime(targetDate, "14:00");

    const slots = calculateBarberDaySlots({
      targetDateStr: targetDate,
      barberId: "barber-1",
      serviceDurationMinutes: 30,
      slotIntervalMinutes: 30,
      workingHours: {
        isOpen: true,
        startTime: "09:00",
        endTime: "16:00",
      },
      existingAppointments: [],
      timeOffs: [
        {
          startDate: offStart,
          endDate: offEnd,
          reason: "Dentist appointment",
        },
      ],
    });

    const slot1100 = slots.find((s) => s.timeStr === "11:00");
    const slot1200 = slots.find((s) => s.timeStr === "12:00");
    const slot1330 = slots.find((s) => s.timeStr === "13:30");
    const slot1400 = slots.find((s) => s.timeStr === "14:00");

    expect(slot1100).toBeUndefined();
    expect(slot1200).toBeUndefined();
    expect(slot1330).toBeUndefined();
    expect(slot1400).toBeDefined();
  });

  it("should filter out past time slots if booking for today in Addis Ababa", () => {
    const today = "2026-10-28";
    // Mock current time in Addis: 14:15
    const mockNow = createAddisDateTime(today, "14:15");

    const slots = calculateBarberDaySlots({
      targetDateStr: today,
      barberId: "barber-1",
      serviceDurationMinutes: 30,
      slotIntervalMinutes: 30,
      minLeadTimeMinutes: 30, // cutoff is 14:15 + 30 min = 14:45
      nowInAddis: mockNow,
      workingHours: {
        isOpen: true,
        startTime: "09:00",
        endTime: "18:00",
      },
      existingAppointments: [],
    });

    // Slots before 14:45 must be excluded
    const slot0900 = slots.find((s) => s.timeStr === "09:00");
    const slot1400 = slots.find((s) => s.timeStr === "14:00");
    const slot1430 = slots.find((s) => s.timeStr === "14:30");
    const slot1500 = slots.find((s) => s.timeStr === "15:00");

    expect(slot0900).toBeUndefined();
    expect(slot1400).toBeUndefined();
    expect(slot1430).toBeUndefined();
    expect(slot1500).toBeDefined();
  });

  it("should merge slots from multiple barbers for 'any available' option", () => {
    const barber1Slots: SlotResult[] = [
      {
        timeStr: "09:00",
        displayTime: "09:00 AM",
        startMinutes: 540,
        endMinutes: 570,
        dateStr: targetDate,
        startTimeIso: "",
        endTimeIso: "",
        barberId: "barber-1",
        barberName: "Dawit",
      },
      {
        timeStr: "09:30",
        displayTime: "09:30 AM",
        startMinutes: 570,
        endMinutes: 600,
        dateStr: targetDate,
        startTimeIso: "",
        endTimeIso: "",
        barberId: "barber-1",
        barberName: "Dawit",
      },
    ];

    const barber2Slots: SlotResult[] = [
      {
        timeStr: "09:30",
        displayTime: "09:30 AM",
        startMinutes: 570,
        endMinutes: 600,
        dateStr: targetDate,
        startTimeIso: "",
        endTimeIso: "",
        barberId: "barber-2",
        barberName: "Yohannes",
      },
      {
        timeStr: "10:00",
        displayTime: "10:00 AM",
        startMinutes: 600,
        endMinutes: 630,
        dateStr: targetDate,
        startTimeIso: "",
        endTimeIso: "",
        barberId: "barber-2",
        barberName: "Yohannes",
      },
    ];

    const map = new Map();
    map.set("barber-1", { barberName: "Dawit", slots: barber1Slots });
    map.set("barber-2", { barberName: "Yohannes", slots: barber2Slots });

    const merged = mergeBarberSlots(map);

    expect(merged.length).toBe(3); // 09:00, 09:30, 10:00
    expect(merged[0].timeStr).toBe("09:00");
    expect(merged[0].availableBarbers.map((b) => b.id)).toEqual(["barber-1"]);

    expect(merged[1].timeStr).toBe("09:30");
    // Both barbers are available at 09:30
    expect(merged[1].availableBarbers.map((b) => b.id)).toEqual(["barber-1", "barber-2"]);

    expect(merged[2].timeStr).toBe("10:00");
    expect(merged[2].availableBarbers.map((b) => b.id)).toEqual(["barber-2"]);
  });
});

