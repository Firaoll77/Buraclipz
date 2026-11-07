import { NextRequest, NextResponse } from "next/server";
import { cancelAppointmentByToken } from "@/lib/data-store";
import { sendTelegramMessage } from "@/lib/notifications/telegram";
import { formatDualDate } from "@/lib/ethiopian-calendar";
import { minutesTo12HourString } from "@/lib/date-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    let reason = "Customer requested cancellation via portal";
    try {
      const body = await request.json();
      if (body?.reason) reason = body.reason;
    } catch {
      // body optional
    }

    const cancelledAppt = await cancelAppointmentByToken(token, reason);

    // Dispatch cancellation alert to shop Telegram channel
    const shopChatId = process.env.TELEGRAM_SHOP_CHAT_ID || "shop-admin-chat";
    const dual = formatDualDate(cancelledAppt.startTime);
    const timeMin = cancelledAppt.startTime.getHours() * 60 + cancelledAppt.startTime.getMinutes();
    const timeDisplay = minutesTo12HourString(timeMin);

    const alertMsg = `
🚫 <b>Appointment Cancelled</b>

🔖 <b>Ref:</b> <code>${cancelledAppt.bookingReference}</code>
👤 <b>Customer:</b> ${cancelledAppt.customerName} (${cancelledAppt.customerPhone})
💈 <b>Barber:</b> ${cancelledAppt.barberName}
✂️ <b>Service:</b> ${cancelledAppt.serviceName}
📅 <b>Was Scheduled:</b> ${dual.gregorianFormatted} at ${timeDisplay}
💬 <b>Reason:</b> <i>${cancelledAppt.cancellationReason || "No reason given"}</i>

The slot has been released back into available inventory.
`.trim();

    sendTelegramMessage(shopChatId, alertMsg).catch((err) =>
      console.error("Failed to send cancellation alert:", err)
    );

    return NextResponse.json({
      success: true,
      message: "Appointment cancelled successfully. We hope to see you another time!",
      appointment: cancelledAppt,
    });
  } catch (error: any) {
    console.error("Cancel API error:", error);
    const isCutoff = error.message?.includes("2 hours");
    return NextResponse.json(
      { error: error.message || "Failed to cancel appointment" },
      { status: isCutoff ? 400 : 500 }
    );
  }
}

