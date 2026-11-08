/**
 * Telegram Bot Notification Provider for Addis Ababa Barbershop
 */

import { BookingNotificationPayload, NotificationResult } from "./types";
import { formatDualDate, formatETB } from "../ethiopian-calendar";
import { minutesTo12HourString } from "../date-utils";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_SHOP_CHAT_ID = process.env.TELEGRAM_SHOP_CHAT_ID || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Sends a message via Telegram Bot API or logs in development
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<NotificationResult> {
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    console.log(`[TELEGRAM MOCK] Chat ID: ${chatId || "(no chat id)"}`);
    console.log(`[TELEGRAM MOCK MESSAGE]\n${text}\n-------------------`);
    return {
      success: true,
      channel: "telegram",
      recipient: chatId || "mock-chat",
      messageId: `mock-tg-${Date.now()}`,
    };
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error("[TELEGRAM ERROR]", data);
      return {
        success: false,
        channel: "telegram",
        recipient: chatId,
        error: data.description || "Failed to send Telegram message",
      };
    }

    return {
      success: true,
      channel: "telegram",
      recipient: chatId,
      messageId: String(data.result?.message_id),
    };
  } catch (error: any) {
    console.error("[TELEGRAM EXCEPTION]", error);
    return {
      success: false,
      channel: "telegram",
      recipient: chatId,
      error: error.message,
    };
  }
}

/**
 * Dispatches Telegram alerts to both the shop owner/barber channel and customer (if provided)
 */
export async function sendBookingTelegramAlert(
  payload: BookingNotificationPayload
): Promise<NotificationResult[]> {
  const dual = formatDualDate(payload.startTime);
  const timeMin = payload.startTime.getHours() * 60 + payload.startTime.getMinutes();
  const timeDisplay = minutesTo12HourString(timeMin);
  const manageUrl = `${APP_URL}/manage/${payload.cancellationToken}`;

  const messageText = `
💈 <b>New Booking: Buraclipz</b>

🔖 <b>Ref:</b> <code>${payload.bookingReference}</code>
👤 <b>Customer:</b> ${payload.customerName}
📞 <b>Phone:</b> ${payload.customerPhone}
✂️ <b>Service:</b> ${payload.serviceName} (${payload.durationMinutes} min)
💈 <b>Barber:</b> ${payload.barberName}
📅 <b>Date:</b> ${dual.gregorianFormatted} at ${timeDisplay}
🇪🇹 <b>Ethio Date:</b> ${dual.ethiopianFormatted}
💵 <b>Total:</b> ${formatETB(payload.priceEtb)} (Pay at shop)
${payload.notes ? `📝 <b>Notes:</b> <i>${payload.notes}</i>\n` : ""}
🔗 <a href="${manageUrl}">Manage Appointment</a>
`.trim();

  const results: NotificationResult[] = [];

  // 1. Notify the Shop Owner / Barbershop Team
  if (TELEGRAM_SHOP_CHAT_ID) {
    const shopResult = await sendTelegramMessage(TELEGRAM_SHOP_CHAT_ID, messageText);
    results.push(shopResult);
  } else {
    // In dev / test, log the alert
    const devLog = await sendTelegramMessage("shop-admin-chat", messageText);
    results.push(devLog);
  }

  // 2. Notify customer directly if they linked Telegram
  if (payload.telegramChatId) {
    const customerMsg = `
💈 <b>Booking Confirmed - Buraclipz</b>

Hello ${payload.customerName}! Your appointment is confirmed:

🔖 <b>Ref:</b> <code>${payload.bookingReference}</code>
✂️ <b>Service:</b> ${payload.serviceName}
💈 <b>Barber:</b> ${payload.barberName}
📅 <b>When:</b> ${dual.gregorianFormatted} at ${timeDisplay}
🇪🇹 <b>Ethio Date:</b> ${dual.ethiopianFormatted}
💵 <b>Price:</b> ${formatETB(payload.priceEtb)} (Pay at shop)
📍 <b>Location:</b> Ayat 49, Addis Ababa

Manage / Cancel (up to 2h before):
<a href="${manageUrl}">${manageUrl}</a>
`.trim();

    const customerResult = await sendTelegramMessage(payload.telegramChatId, customerMsg);
    results.push(customerResult);
  }

  return results;
}

/**
 * 24-Hour Reminder via Telegram
 */
export async function send24HourReminderTelegram(
  payload: BookingNotificationPayload,
  chatId: string
): Promise<NotificationResult> {
  const dual = formatDualDate(payload.startTime);
  const timeMin = payload.startTime.getHours() * 60 + payload.startTime.getMinutes();
  const timeDisplay = minutesTo12HourString(timeMin);
  const manageUrl = `${APP_URL}/manage/${payload.cancellationToken}`;

  const reminderText = `
⏰ <b>Appointment Reminder: Tomorrow at ${timeDisplay}</b>

Hello ${payload.customerName}, this is a reminder of your appointment tomorrow at Buraclipz!

🔖 <b>Ref:</b> <code>${payload.bookingReference}</code>
✂️ <b>Service:</b> ${payload.serviceName}
💈 <b>Barber:</b> ${payload.barberName}
📅 <b>When:</b> Tomorrow, ${dual.gregorianFormatted} at ${timeDisplay}
🇪🇹 <b>Ethio Date:</b> ${dual.ethiopianFormatted}
💵 <b>Total:</b> ${formatETB(payload.priceEtb)}
📍 <b>Shop:</b> Ayat 49, Addis Ababa

Manage appointment:
<a href="${manageUrl}">${manageUrl}</a>
`.trim();

  return await sendTelegramMessage(chatId, reminderText);
}
