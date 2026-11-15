// Concurrency check: two simultaneous bookings, same paymentPublicId + receipt.
// Run: NODE_ENV=test npx tsx scripts/test-screenshot-reuse.ts
import { bookAppointmentWithProtection } from "../src/lib/booking-transaction";

const base = {
  serviceId: "srv-taper",
  barberId: "barber-dawit",
  customerName: "Test User",
  customerPhone: "+251911000001",
  paymentPublicId: "barber/payment-screenshots/test-asset-123",
  paymentScreenshot: null,
};

const day = new Date(Date.now() + 3 * 24 * 3600 * 1000);
const d = day.toISOString().slice(0, 10);

const mk = (time: string) => ({
  ...base,
  startTime: new Date(`${d}T${time}:00+03:00`),
  endTime: new Date(new Date(`${d}T${time}:00+03:00`).getTime() + 40 * 60 * 1000),
});

async function main() {
  const [r1, r2] = await Promise.allSettled([
    bookAppointmentWithProtection(mk("10:00")),
    bookAppointmentWithProtection(mk("11:00")),
  ]);

  const summarize = (r: PromiseSettledResult<any>) =>
    r.status === "fulfilled" ? "SUCCESS" : `FAIL: ${r.reason?.message}`;

  console.log("Request A (10:00):", summarize(r1));
  console.log("Request B (11:00):", summarize(r2));

  const ok = [r1, r2].filter((r) => r.status === "fulfilled").length;
  console.log(ok === 1 ? "\nPASS: exactly one booking succeeded" : `\nFAIL: ${ok} bookings succeeded`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
