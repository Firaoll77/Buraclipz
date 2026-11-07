/**
 * Notification Types and Payloads for Addis Ababa Barbershop
 */

export interface BookingNotificationPayload {
  id?: string;
  bookingReference: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  telegramChatId?: string | null;
  barberName: string;
  serviceName: string;
  durationMinutes: number;
  priceEtb: number;
  startTime: Date;
  cancellationToken: string;
  notes?: string | null;
}

export interface NotificationResult {
  success: boolean;
  channel: "email" | "telegram" | "sms";
  recipient: string;
  messageId?: string;
  error?: string;
}
