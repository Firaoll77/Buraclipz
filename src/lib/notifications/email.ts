/**
 * Resend Email Notification Provider
 */

import { BookingNotificationPayload, NotificationResult } from "./types";
import { formatDualDate, formatETB } from "../ethiopian-calendar";
import { minutesTo12HourString } from "../date-utils";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "Buraclipz <booking@buraclipz.et>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Sends an email using the Resend API or logs in development/test mode
 */
async function sendResendMail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<NotificationResult> {
  const { to, subject, html, text } = options;

  if (!RESEND_API_KEY || RESEND_API_KEY.includes("sample_key")) {
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    console.log(`[EMAIL MOCK CONTENT]\n${text}\n-------------------`);
    return {
      success: true,
      channel: "email",
      recipient: to,
      messageId: `mock-resend-${Date.now()}`,
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[RESEND ERROR]", data);
      return {
        success: false,
        channel: "email",
        recipient: to,
        error: data.message || "Failed to send email via Resend",
      };
    }

    return {
      success: true,
      channel: "email",
      recipient: to,
      messageId: data.id,
    };
  } catch (error: any) {
    console.error("[RESEND EXCEPTION]", error);
    return {
      success: false,
      channel: "email",
      recipient: to,
      error: error.message,
    };
  }
}

/**
 * Sends Instant Booking Confirmation Email
 */
export async function sendBookingConfirmationEmail(
  payload: BookingNotificationPayload
): Promise<NotificationResult | null> {
  if (!payload.customerEmail) return null;

  const dual = formatDualDate(payload.startTime);
  const timeMin = payload.startTime.getHours() * 60 + payload.startTime.getMinutes();
  const timeDisplay = minutesTo12HourString(timeMin);
  const manageUrl = `${APP_URL}/manage/${payload.cancellationToken}`;

  const subject = `Booking Confirmed: ${payload.bookingReference} - Buraclipz`;

  const text = `
Buraclipz - Appointment Confirmed
============================================
Hello ${payload.customerName},

Your appointment has been successfully booked!

Booking Ref: ${payload.bookingReference}
Service:     ${payload.serviceName} (${payload.durationMinutes} min)
Barber:      ${payload.barberName}
Date & Time: ${dual.gregorianFormatted} at ${timeDisplay}
             Ethiopian Date: ${dual.ethiopianFormatted}
Price:       ${formatETB(payload.priceEtb)} (Pay at shop upon completion)
Location:    Ayat 49, Addis Ababa

Need to reschedule or cancel? (Must be at least 2 hours before):
${manageUrl}

We look forward to serving you!
Buraclipz Addis Ababa
`.trim();

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #3A3A3A; color: #FFFFFF; padding: 25px; border-radius: 20px;">
  <div style="text-align: center; border-bottom: 1px solid #525252; padding-bottom: 20px;">
    <h1 style="color: #ff9800; margin: 0; font-size: 24px;">Buraclipz</h1>
    <p style="color: #CCCCCC; font-size: 13px; margin: 5px 0 0 0;">Ayat 49, Addis Ababa</p>
  </div>

  <div style="padding: 20px 0;">
    <h2 style="color: #FFFFFF; font-size: 18px; margin-top: 0;">Appointment Confirmed!</h2>
    <p style="color: #E0E0E0; font-size: 14px;">Hello ${payload.customerName}, your booking has been reserved on our shop calendar.</p>

    <div style="background-color: #2A2A2A; border-radius: 12px; padding: 15px; margin: 20px 0; border: 1px solid #525252;">
      <p style="margin: 6px 0; font-size: 14px;"><strong style="color: #CCCCCC;">Booking Ref:</strong> <span style="color: #fdd835; font-family: monospace; font-weight: bold;">${payload.bookingReference}</span></p>
      <p style="margin: 6px 0; font-size: 14px;"><strong style="color: #CCCCCC;">Service:</strong> ${payload.serviceName} (${payload.durationMinutes} min)</p>
      <p style="margin: 6px 0; font-size: 14px;"><strong style="color: #CCCCCC;">Barber:</strong> ${payload.barberName}</p>
      <p style="margin: 6px 0; font-size: 14px;"><strong style="color: #CCCCCC;">Date & Time:</strong> ${dual.gregorianFormatted} at ${timeDisplay}</p>
      <p style="margin: 6px 0; font-size: 12px; color: #fdd835;"><strong>Ethiopian Calendar:</strong> ${dual.ethiopianFormatted}</p>
      <p style="margin: 6px 0; font-size: 14px;"><strong style="color: #CCCCCC;">Total Due:</strong> <span style="color: #ff9800; font-weight: bold;">${formatETB(payload.priceEtb)}</span></p>
      <p style="margin: 6px 0; font-size: 12px; color: #AAAAAA;"><em>Payment at the shop in cash or via Telebirr / CBE Birr upon service completion.</em></p>
    </div>

    <div style="text-align: center; margin: 25px 0;">
      <a href="${manageUrl}" style="background-color: #ff9800; color: #000000; text-decoration: none; padding: 12px 25px; border-radius: 50px; font-weight: bold; font-size: 14px; display: inline-block;">Manage / Cancel Appointment</a>
    </div>
  </div>

  <div style="border-top: 1px solid #525252; padding-top: 15px; text-align: center; font-size: 11px; color: #999999;">
    Buraclipz • Ayat 49, Addis Ababa • Direct: +251 911 223 344
  </div>
</div>
  `.trim();

  return await sendResendMail({
    to: payload.customerEmail,
    subject,
    text,
    html,
  });
}

/**
 * Sends 24-Hour Reminder Email
 */
export async function send24HourReminderEmail(
  payload: BookingNotificationPayload
): Promise<NotificationResult | null> {
  if (!payload.customerEmail) return null;

  const dual = formatDualDate(payload.startTime);
  const timeMin = payload.startTime.getHours() * 60 + payload.startTime.getMinutes();
  const timeDisplay = minutesTo12HourString(timeMin);
  const manageUrl = `${APP_URL}/manage/${payload.cancellationToken}`;

  const subject = `Reminder: Tomorrow at ${timeDisplay} - Buraclipz (${payload.bookingReference})`;

  const text = `
Reminder: Your Barbershop Appointment Tomorrow!
==============================================
Hello ${payload.customerName},

This is a friendly reminder of your appointment tomorrow at Buraclipz.

Ref:         ${payload.bookingReference}
Service:     ${payload.serviceName}
Barber:      ${payload.barberName}
Date & Time: Tomorrow, ${dual.gregorianFormatted} at ${timeDisplay} (${dual.ethiopianFormatted})
Price:       ${formatETB(payload.priceEtb)} (Pay at shop)
Location:    Ayat 49, Addis Ababa

Manage or cancel your booking (up to 2 hours before):
${manageUrl}

See you tomorrow!
`.trim();

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #3A3A3A; color: #FFFFFF; padding: 25px; border-radius: 20px;">
  <div style="text-align: center; border-bottom: 1px solid #525252; padding-bottom: 20px;">
    <h1 style="color: #ff9800; margin: 0; font-size: 22px;">Appointment Tomorrow!</h1>
    <p style="color: #CCCCCC; font-size: 13px; margin: 5px 0 0 0;">Buraclipz • Addis Ababa</p>
  </div>

  <div style="padding: 20px 0;">
    <p style="color: #FFFFFF; font-size: 15px;">Hello <strong>${payload.customerName}</strong>, we look forward to seeing you tomorrow for your grooming session.</p>

    <div style="background-color: #2A2A2A; border-radius: 12px; padding: 15px; margin: 15px 0; border: 1px solid #525252;">
      <p style="margin: 5px 0; font-size: 14px;"><strong>Time:</strong> <span style="color: #fdd835;">${dual.gregorianFormatted} at ${timeDisplay}</span></p>
      <p style="margin: 5px 0; font-size: 12px; color: #AAAAAA;">Ethiopian Date: ${dual.ethiopianFormatted}</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Service:</strong> ${payload.serviceName}</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Barber:</strong> ${payload.barberName}</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Total Due:</strong> ${formatETB(payload.priceEtb)} (Pay at shop)</p>
    </div>

    <div style="text-align: center; margin: 20px 0;">
      <a href="${manageUrl}" style="background-color: #fdd835; color: #000000; text-decoration: none; padding: 10px 20px; border-radius: 50px; font-weight: bold; font-size: 13px; display: inline-block;">Manage Appointment</a>
    </div>
  </div>
</div>
  `.trim();

  return await sendResendMail({
    to: payload.customerEmail,
    subject,
    text,
    html,
  });
}
