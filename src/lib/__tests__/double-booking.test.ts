import { describe, it, expect, beforeEach } from "vitest";
import {
  bookAppointmentWithProtection,
  DoubleBookingError,
} from "../booking-transaction";
import { createAddisDateTime } from "../date-utils";

describe("Double-Booking Protection & Concurrency Control", () => {
  const testDate = "2026-12-01";

  it("should successfully book a non-conflicting time slot", async () => {
    const start = createAddisDateTime(testDate, "09:00");
    const end = createAddisDateTime(testDate, "09:40");

    const appt = await bookAppointmentWithProtection({
      serviceId: "srv-classic-cut",
      barberId: "barber-dawit",
      startTime: start,
      endTime: end,
      customerName: "Abebe Bikila",
      customerPhone: "+251911112233",
    });

    expect(appt).toBeDefined();
    expect(appt.bookingReference).toMatch(/^ARB-\d{4}$/);
    expect(appt.status).toBe("BOOKED");
  });

  it("should reject an exact duplicate slot booking with DoubleBookingError", async () => {
    const start = createAddisDateTime(testDate, "10:00");
    const end = createAddisDateTime(testDate, "10:40");

    // First booking succeeds
    await bookAppointmentWithProtection({
      serviceId: "srv-classic-cut",
      barberId: "barber-dawit",
      startTime: start,
      endTime: end,
      customerName: "First Customer",
      customerPhone: "+251911445566",
    });

    // Second booking for identical slot must be rejected
    await expect(
      bookAppointmentWithProtection({
        serviceId: "srv-classic-cut",
        barberId: "barber-dawit",
        startTime: start,
        endTime: end,
        customerName: "Second Customer",
        customerPhone: "+251922556677",
      })
    ).rejects.toThrow(DoubleBookingError);
  });

  it("should prevent double booking under simultaneous concurrent requests (race condition)", async () => {
    const start = createAddisDateTime(testDate, "12:00");
    const end = createAddisDateTime(testDate, "12:40");

    // Fire two simultaneous requests at the exact same instant
    const req1 = bookAppointmentWithProtection({
      serviceId: "srv-classic-cut",
      barberId: "barber-dawit",
      startTime: start,
      endTime: end,
      customerName: "Concurrent User A",
      customerPhone: "+251911889900",
    });

    const req2 = bookAppointmentWithProtection({
      serviceId: "srv-classic-cut",
      barberId: "barber-dawit",
      startTime: start,
      endTime: end,
      customerName: "Concurrent User B",
      customerPhone: "+251922889900",
    });

    const results = await Promise.allSettled([req1, req2]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly one must succeed and exactly one must fail
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const failureReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(failureReason).toBeInstanceOf(DoubleBookingError);
  });

  it("should reject partially overlapping appointments", async () => {
    // Booking 1: 14:00 - 14:40
    const start1 = createAddisDateTime(testDate, "14:00");
    const end1 = createAddisDateTime(testDate, "14:40");

    await bookAppointmentWithProtection({
      serviceId: "srv-classic-cut",
      barberId: "barber-dawit",
      startTime: start1,
      endTime: end1,
      customerName: "Client 1",
      customerPhone: "+251933112233",
    });

    // Booking 2: 14:20 - 15:00 (overlaps by 20 minutes)
    const start2 = createAddisDateTime(testDate, "14:20");
    const end2 = createAddisDateTime(testDate, "15:00");

    await expect(
      bookAppointmentWithProtection({
        serviceId: "srv-classic-cut",
        barberId: "barber-dawit",
        startTime: start2,
        endTime: end2,
        customerName: "Client 2",
        customerPhone: "+251944112233",
      })
    ).rejects.toThrow(DoubleBookingError);
  });

  it("should allow different barbers to be booked simultaneously at the same time", async () => {
    const start = createAddisDateTime(testDate, "16:00");
    const end = createAddisDateTime(testDate, "16:40");

    // Barber 1: Dawit
    const reqDawit = bookAppointmentWithProtection({
      serviceId: "srv-classic-cut",
      barberId: "barber-dawit",
      startTime: start,
      endTime: end,
      customerName: "Dawit Client",
      customerPhone: "+251911000111",
    });

    // Barber 2: Yohannes
    const reqYohannes = bookAppointmentWithProtection({
      serviceId: "srv-classic-cut",
      barberId: "barber-yohannes",
      startTime: start,
      endTime: end,
      customerName: "Yohannes Client",
      customerPhone: "+251922000222",
    });

    const [dawitBooking, yohannesBooking] = await Promise.all([reqDawit, reqYohannes]);

    expect(dawitBooking.barberName).toBe("Dawit Tadesse");
    expect(yohannesBooking.barberName).toBe("Yohannes Bekele");
  });

  it("should allow consecutive non-overlapping appointments for the same barber", async () => {
    // Appointment 1: 17:00 - 17:40
    const start1 = createAddisDateTime(testDate, "17:00");
    const end1 = createAddisDateTime(testDate, "17:40");

    const appt1 = await bookAppointmentWithProtection({
      serviceId: "srv-classic-cut",
      barberId: "barber-dawit",
      startTime: start1,
      endTime: end1,
      customerName: "First in queue",
      customerPhone: "+251911999888",
    });

    // Appointment 2: 17:50 - 18:30 (starts after 10 min buffer)
    const start2 = createAddisDateTime(testDate, "17:50");
    const end2 = createAddisDateTime(testDate, "18:30");

    const appt2 = await bookAppointmentWithProtection({
      serviceId: "srv-classic-cut",
      barberId: "barber-dawit",
      startTime: start2,
      endTime: end2,
      customerName: "Second in queue",
      customerPhone: "+251922999888",
    });

    expect(appt1.status).toBe("BOOKED");
    expect(appt2.status).toBe("BOOKED");
  });
});
