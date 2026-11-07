import { describe, it, expect } from "vitest";
import {
  cancelAppointmentByToken,
  rescheduleAppointmentByToken,
  getAppointmentByToken,
  createBooking,
} from "../data-store";

describe("Step 6: Cancel/Reschedule via Secure Token & 2-Hour Cutoff", () => {
  it("should allow cancellation when appointment is > 2 hours away", async () => {
    // Unique slot: 5 days in future
    const futureStart = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const futureEnd = new Date(futureStart.getTime() + 40 * 60 * 1000);

    const appt = await createBooking({
      serviceId: "srv-classic-cut",
      barberId: "barber-dawit",
      startTime: futureStart,
      endTime: futureEnd,
      customerName: "Eligible Customer",
      customerPhone: "+251911334455",
    });

    const cancelled = await cancelAppointmentByToken(
      appt.cancellationToken,
      "Emergency trip out of Addis"
    );

    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancellationReason).toBe("Emergency trip out of Addis");
    expect(cancelled.cancelledAt).toBeDefined();

    // Verify it is updated in store
    const stored = await getAppointmentByToken(appt.cancellationToken);
    expect(stored?.status).toBe("CANCELLED");
  });

  it("should REJECT cancellation when appointment is < 2 hours away", async () => {
    // Slot in 30 minutes (< 2 hours away)
    const nearStart = new Date(Date.now() + 30 * 60 * 1000);
    const nearEnd = new Date(nearStart.getTime() + 40 * 60 * 1000);

    const appt = await createBooking({
      serviceId: "srv-classic-cut",
      barberId: "barber-abel",
      startTime: nearStart,
      endTime: nearEnd,
      customerName: "Imminent Customer",
      customerPhone: "+251922334455",
    });

    await expect(
      cancelAppointmentByToken(appt.cancellationToken, "Changed mind")
    ).rejects.toThrow(/cannot be cancelled within 2 hours/);

    const stored = await getAppointmentByToken(appt.cancellationToken);
    expect(stored?.status).toBe("BOOKED");
  });

  it("should allow rescheduling when appointment is > 2 hours away", async () => {
    // Initial slot: 6 days in future
    const initialStart = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
    const initialEnd = new Date(initialStart.getTime() + 40 * 60 * 1000);

    const appt = await createBooking({
      serviceId: "srv-classic-cut",
      barberId: "barber-dawit",
      startTime: initialStart,
      endTime: initialEnd,
      customerName: "Rescheduling Customer",
      customerPhone: "+251933334455",
    });

    // Reschedule to 7 days in future with Yohannes
    const newStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const newEnd = new Date(newStart.getTime() + 40 * 60 * 1000);

    const rescheduled = await rescheduleAppointmentByToken(
      appt.cancellationToken,
      newStart,
      newEnd,
      "barber-yohannes"
    );

    expect(rescheduled.status).toBe("BOOKED");
    expect(rescheduled.startTime.getTime()).toBe(newStart.getTime());
    expect(rescheduled.barberName).toBe("Yohannes Bekele");
  });

  it("should REJECT rescheduling when appointment is < 2 hours away", async () => {
    // Slot in 45 minutes (< 2h)
    const nearStart = new Date(Date.now() + 45 * 60 * 1000);
    const nearEnd = new Date(nearStart.getTime() + 40 * 60 * 1000);

    const appt = await createBooking({
      serviceId: "srv-classic-cut",
      barberId: "barber-yohannes",
      startTime: nearStart,
      endTime: nearEnd,
      customerName: "Late Rescheduler",
      customerPhone: "+251944334455",
    });

    const newStart = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    const newEnd = new Date(newStart.getTime() + 40 * 60 * 1000);

    await expect(
      rescheduleAppointmentByToken(appt.cancellationToken, newStart, newEnd)
    ).rejects.toThrow(/cannot be rescheduled within 2 hours/);
  });
});
