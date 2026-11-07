import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Buraclipz Addis Ababa",
  description:
    "Privacy and data protection policy for Buraclipz appointment booking platform in Addis Ababa, Ethiopia.",
};

export default function PrivacyPage() {
  return (
    <main className="flex-1 flex flex-col gap-30 pb-40">
      {/* Title Banner */}
      <div className="card-light p-28 sm:p-40 flex flex-col gap-12 bg-[#faf5ea] border-2 border-[#141414]">
        <div className="flex items-center gap-10">
          <span className="badge-purple">Security &amp; Rights</span>
          <span className="badge-accent">No Online Payments</span>
        </div>
        <h1 className="font-heading text-4xl sm:text-6xl text-[#000000] tracking-tight uppercase">
          Privacy Policy
        </h1>
        <p className="text-sm sm:text-base text-[#666666] max-w-2xl leading-relaxed font-medium">
          Buraclipz (Bole Medhanialem, Addis Ababa, Ethiopia) • Effective January 2026
        </p>
      </div>

      <div className="card-light p-28 sm:p-40 flex flex-col gap-25 text-xs sm:text-sm text-[#000000] leading-relaxed border-2 border-[#141414]">
        {/* Section 1 */}
        <section className="flex flex-col gap-10">
          <h2 className="font-heading text-2xl text-[#000000]">1. Local Guarantee: No Online Payments</h2>
          <p className="text-[#666666] font-medium leading-relaxed">
            Buraclipz operates exclusively on an <strong>in-shop payment</strong> model in Addis Ababa. We never request, collect, or store credit card numbers, debit cards, PINs, or bank account credentials on this website. All grooming services are settled in cash or via local mobile banking (Telebirr / CBE Birr) directly at our shop counter upon completion.
          </p>
        </section>

        {/* Section 2 */}
        <section className="flex flex-col gap-10 pt-15 border-t-2 border-[#141414]/15">
          <h2 className="font-heading text-2xl text-[#000000]">2. Information We Collect</h2>
          <p className="text-[#666666] font-medium">To schedule your appointment and prevent double-booking, we only collect essential booking details:</p>
          <ul className="list-disc list-inside space-y-5 text-xs text-[#666666] font-medium">
            <li><strong>Full Name:</strong> To greet you and seat you with your master barber.</li>
            <li><strong>Ethiopian Mobile Number (+251):</strong> To dispatch booking confirmations, manage tokens, and optional 24-hour reminders.</li>
            <li><strong>Email Address (Optional):</strong> To deliver an electronic calendar invite and confirmation receipt.</li>
            <li><strong>Telegram Chat ID (Optional):</strong> When you opt-in to receive automated Telegram alerts from <code>@AradaBarberBot</code>.</li>
            <li><strong>Booking Preferences:</strong> Selected service, barber, date, time, and optional grooming notes.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="flex flex-col gap-10 pt-15 border-t-2 border-[#141414]/15">
          <h2 className="font-heading text-2xl text-[#000000]">3. How Your Information Is Used</h2>
          <p className="text-[#666666] font-medium">Your details are used solely to:</p>
          <ul className="list-disc list-inside space-y-5 text-xs text-[#666666] font-medium">
            <li>Reserve your time slot with your chosen barber and block conflicting bookings.</li>
            <li>Send you a booking confirmation and 24-hour reminder before your scheduled cut.</li>
            <li>Generate your encrypted management token for self-service cancellation or rescheduling.</li>
          </ul>
          <p className="text-xs text-[#ff8442] font-bold">
            We never sell, rent, or share customer contact details with third-party advertisers.
          </p>
        </section>

        {/* Section 4 */}
        <section className="flex flex-col gap-10 pt-15 border-t-2 border-[#141414]/15">
          <h2 className="font-heading text-2xl text-[#000000]">4. Self-Service Management &amp; 2-Hour Cutoff</h2>
          <p className="text-[#666666] font-medium leading-relaxed">
            Each client receives a private, cryptographically unique link (e.g. <code>/manage/[token]</code>). You maintain full authority to modify your date, switch barbers, or cancel your booking at any time up to 2 hours before your scheduled appointment.
          </p>
        </section>

        {/* Section 5 */}
        <section className="flex flex-col gap-10 pt-15 border-t-2 border-[#141414]/15">
          <h2 className="font-heading text-2xl text-[#000000]">5. Cookies &amp; Tracking</h2>
          <p className="text-xs text-[#666666] font-medium">
            Our public appointment booking site does not use third-party tracking cookies or behavioral advertising pixels. Minimal encrypted session cookies are used exclusively to authenticate authorized shop managers accessing the staff portal.
          </p>
        </section>

        {/* Section 6 */}
        <section className="flex flex-col gap-10 pt-15 border-t-2 border-[#141414]/15">
          <h2 className="font-heading text-2xl text-[#000000]">6. Contacting the Shop</h2>
          <div className="p-15 rounded-card bg-[#faf5ea] border-2 border-[#141414] text-xs font-mono space-y-3">
            <p className="font-bold text-[#000000]">Buraclipz</p>
            <p>Cameroon Street, Bole Medhanialem, Addis Ababa, Ethiopia</p>
            <p>Phone: +251 911 223 344 • Telegram: @AradaBarberBot</p>
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="font-heading text-lg text-[#000000] hover:text-[#ff8442] uppercase tracking-wider"
        >
          ← Return to Home
        </Link>
        <Link
          href="/#book"
          className="btn-primary text-xs uppercase tracking-wider font-extrabold px-20 py-10 shadow-sm"
          style={{ minHeight: 44 }}
        >
          Book an Appointment
        </Link>
      </div>
    </main>
  );
}
