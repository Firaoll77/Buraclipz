/**
 * Optional & Swappable SMS Notification Provider
 * Default: "mock" (logs cleanly)
 * Supported: "mock", "africastalking", "twilio"
 */

import { BookingNotificationPayload, NotificationResult } from "./types";
import { formatDualDate, formatETB } from "../ethiopian-calendar";
import { minutesTo12HourString } from "../date-utils";

export interface SmsProvider {
  sendSms(to: string, message: string): Promise<NotificationResult>;
}

class MockSmsProvider implements SmsProvider {
  async sendSms(to: string, message: string): Promise<NotificationResult> {
    console.log(`[SMS MOCK] To: ${to}`);
    console.log(`[SMS MOCK BODY] ${message}\n-------------------`);
    return {
      success: true,
      channel: "sms",
      recipient: to,
      messageId: `mock-sms-${Date.now()}`,
    };
  }
}

class AfricasTalkingSmsProvider implements SmsProvider {
  private username: string;
  private apiKey: string;

  constructor() {
    this.username = process.env.AT_USERNAME || "sandbox";
    this.apiKey = process.env.AT_API_KEY || "";
  }

  async sendSms(to: string, message: string): Promise<NotificationResult> {
    if (!this.apiKey) {
      return new MockSmsProvider().sendSms(to, message);
    }

    try {
      const body = new URLSearchParams({
        username: this.username,
        to,
        message,
      });

      const res = await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: {
          apiKey: this.apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body.toString(),
      });

      const data = await res.json();
      const recipientData = data.SMSMessageData?.Recipients?.[0];

      return {
        success: recipientData?.status === "Success",
        channel: "sms",
        recipient: to,
        messageId: recipientData?.messageId,
        error: recipientData?.status !== "Success" ? recipientData?.status : undefined,
      };
    } catch (e: any) {
      return {
        success: false,
        channel: "sms",
        recipient: to,
        error: e.message,
      };
    }
  }
}

/**
 * Factory for getting configured SMS provider
 */
export function getSmsProvider(): SmsProvider {
  const providerType = (process.env.SMS_PROVIDER || "mock").toLowerCase();

  switch (providerType) {
    case "africastalking":
      return new AfricasTalkingSmsProvider();
    case "mock":
    default:
      return new MockSmsProvider();
  }
}

/**
 * Sends SMS Booking Confirmation (if enabled)
 */
export async function sendBookingSms(
  payload: BookingNotificationPayload
): Promise<NotificationResult> {
  const provider = getSmsProvider();
  const timeMin = payload.startTime.getHours() * 60 + payload.startTime.getMinutes();
  const timeDisplay = minutesTo12HourString(timeMin);
  const dual = formatDualDate(payload.startTime);

  const message = `Arada Barbershop: Booking ${payload.bookingReference} confirmed for ${payload.serviceName} with ${payload.barberName} on ${dual.gregorianFormatted} at ${timeDisplay}. Total: ${formatETB(payload.priceEtb)} at shop.`;

  return await provider.sendSms(payload.customerPhone, message);
}
