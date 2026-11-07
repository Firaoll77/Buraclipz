/**
 * Central Notifications Dispatcher
 * Dispatches confirmation and reminders across Email (Resend), Telegram Bot, and SMS (Optional)
 */

import { BookingNotificationPayload, NotificationResult } from "./types";
import { sendBookingConfirmationEmail, send24HourReminderEmail } from "./email";
import { sendBookingTelegramAlert, send24HourReminderTelegram } from "./telegram";
import { sendBookingSms } from "./sms";

export * from "./types";
export * from "./email";
export * from "./telegram";
export * from "./sms";

/**
 * Dispatches all confirmation channels upon successful booking
 */
export async function dispatchBookingConfirmation(
  payload: BookingNotificationPayload
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  // 1. Email via Resend (if customer provided email)
  try {
    const emailRes = await sendBookingConfirmationEmail(payload);
    if (emailRes) results.push(emailRes);
  } catch (err) {
    console.error("Email notification dispatch error:", err);
  }

  // 2. Telegram Bot Alert (Shop channel & customer if linked)
  try {
    const tgResults = await sendBookingTelegramAlert(payload);
    results.push(...tgResults);
  } catch (err) {
    console.error("Telegram notification dispatch error:", err);
  }

  // 3. Optional SMS (if SMS_PROVIDER is enabled)
  if (process.env.SMS_ENABLED === "true" || process.env.SMS_PROVIDER === "africastalking") {
    try {
      const smsRes = await sendBookingSms(payload);
      results.push(smsRes);
    } catch (err) {
      console.error("SMS notification dispatch error:", err);
    }
  }

  return results;
}

/**
 * Dispatches 24-hour reminder across available channels
 */
export async function dispatch24HourReminder(
  payload: BookingNotificationPayload
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  if (payload.telegramChatId) {
    try {
      const tgRes = await send24HourReminderTelegram(payload, payload.telegramChatId);
      results.push(tgRes);
    } catch (err) {
      console.error("24h Telegram reminder error:", err);
    }
  }

  return results;
}
