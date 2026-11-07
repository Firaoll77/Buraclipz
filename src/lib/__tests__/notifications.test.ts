import { describe, it, expect, vi } from "vitest";
import {
  sendBookingConfirmationEmail,
  send24HourReminderEmail,
} from "../notifications/email";
import {
  sendBookingTelegramAlert,
  sendTelegramMessage,
} from "../notifications/telegram";
import { sendBookingSms, getSmsProvider } from "../notifications/sms";
import { dispatchBookingConfirmation } from "../notifications";
import { createAddisDateTime } from "../date-utils";

describe("Step 5 Notifications (Resend Email, Telegram Bot & Swappable SMS)", () => {
  const samplePayload = {
    bookingReference: "ARB-3591",
    customerName: "Henok Tesfaye",
    customerPhone: "+251911445566",
    customerEmail: "henok@example.com",
    telegramChatId: "tg-chat-henok",
    barberName: "Dawit Tadesse",
    serviceName: "Skin Fade & Lineup",
    durationMinutes: 45,
    priceEtb: 400,
    startTime: createAddisDateTime("2026-11-15", "11:00"),
    cancellationToken: "tok_henok_test_1234",
    notes: "Low fade preferred",
  };

  it("should format and dispatch booking confirmation email via Resend (mock mode)", async () => {
    const res = await sendBookingConfirmationEmail(samplePayload);
    expect(res).toBeDefined();
    expect(res?.success).toBe(true);
    expect(res?.channel).toBe("email");
    expect(res?.recipient).toBe("henok@example.com");
  });

  it("should format and dispatch 24h reminder email", async () => {
    const res = await send24HourReminderEmail(samplePayload);
    expect(res).toBeDefined();
    expect(res?.success).toBe(true);
    expect(res?.channel).toBe("email");
    expect(res?.recipient).toBe("henok@example.com");
  });

  it("should format and dispatch Telegram bot alerts (shop team and customer)", async () => {
    const results = await sendBookingTelegramAlert(samplePayload);
    expect(results.length).toBeGreaterThanOrEqual(1);

    const customerAlert = results.find((r) => r.recipient === "tg-chat-henok");
    expect(customerAlert).toBeDefined();
    expect(customerAlert?.success).toBe(true);
    expect(customerAlert?.channel).toBe("telegram");
  });

  it("should support swappable SMS provider (mock default)", async () => {
    const provider = getSmsProvider();
    expect(provider).toBeDefined();

    const smsRes = await sendBookingSms(samplePayload);
    expect(smsRes.success).toBe(true);
    expect(smsRes.channel).toBe("sms");
    expect(smsRes.recipient).toBe("+251911445566");
  });

  it("should dispatch through central notification dispatcher without throwing", async () => {
    const results = await dispatchBookingConfirmation(samplePayload);
    expect(results.length).toBeGreaterThanOrEqual(2); // Email + Telegram
    expect(results.every((r) => r.success)).toBe(true);
  });
});

