import Link from "next/link";
import { formatDualDate } from "@/lib/ethiopian-calendar";

export const metadata = {
  title: "Opening Hours | Arada Barbershop Addis Ababa",
  description:
    "Check daily shop opening hours, break times, and schedule in Addis Ababa local time (UTC+3).",
};

const WEEKLY_HOURS = [
  { day: "Monday", hours: "09:00 – 20:00", breakTime: "13:00 – 14:00", status: "Open" },
  { day: "Tuesday", hours: "09:00 – 20:00", breakTime: "13:00 – 14:00", status: "Open" },
  { day: "Wednesday", hours: "09:00 – 20:00", breakTime: "13:00 – 14:00", status: "Open" },
  { day: "Thursday", hours: "09:00 – 20:00", breakTime: "13:00 – 14:00", status: "Open" },
  { day: "Friday", hours: "09:00 – 20:00", breakTime: "13:00 – 14:00", status: "Open" },
  { day: "Saturday", hours: "09:00 – 20:00", breakTime: "13:00 – 14:00", status: "Open" },
  { day: "Sunday", hours: "10:00 – 18:00", breakTime: "13:00 – 14:00", status: "Open (Short Hours)" },
];

export default function HoursPage() {
  const today = new Date();
  const dateInfo = formatDualDate(today);

  return (
    <main className="flex-1 flex flex-col gap-30 pb-40">
      {/* Title Banner */}
      <div className="card-light p-28 sm:p-40 flex flex-col gap-12 bg-[#faf5ea] border-2 border-[#141414]">
        <div className="flex items-center gap-10">
          <span className="badge-purple">Timetable</span>
          <span className="badge-accent">UTC+3 (Addis Clock)</span>
        </div>
        <h1 className="font-heading text-4xl sm:text-6xl text-[#000000] tracking-tight uppercase">
          Working Hours &amp; Schedule
        </h1>
        <p className="text-sm sm:text-base text-[#666666] max-w-2xl leading-relaxed font-medium">
          Open 7 days a week on Addis Ababa local time. All booking slots, reminders, and cancellation cutoffs strictly match our shop clock.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
        {/* Weekly Timetable */}
        <div className="card-light p-28 flex flex-col gap-15 border-2 border-[#141414]">
          <div className="flex items-center justify-between pb-10 border-b-2 border-[#141414]">
            <h2 className="font-heading text-2xl text-[#000000]">Weekly Shop Hours</h2>
            <span className="badge-purple text-[10px]">East Africa Time</span>
          </div>

          <div className="flex flex-col gap-8">
            {WEEKLY_HOURS.map((item) => (
              <div
                key={item.day}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-15 rounded-card bg-[#faf5ea] border-2 border-[#141414] text-xs gap-5"
              >
                <div className="flex items-center gap-10">
                  <span className="font-heading text-xl text-[#000000] min-w-[90px]">{item.day}</span>
                  <span className="text-[#666666] font-mono font-medium">Break: {item.breakTime}</span>
                </div>
                <div className="flex items-center gap-10">
                  <span className="font-mono text-[#000000] font-bold text-sm">{item.hours}</span>
                  <span className="badge-accent text-[10px] py-0.5 px-8">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-10 border-t border-[#141414]/15 flex items-center justify-between">
            <span className="text-xs text-[#666666] font-bold">Want to secure a slot in advance?</span>
            <Link
              href="/#book"
              className="btn-primary text-xs uppercase tracking-wider font-extrabold px-15 py-6"
              style={{ minHeight: 38 }}
            >
              Check Slots →
            </Link>
          </div>
        </div>

        {/* Local Calendar & Shop Policies Card */}
        <div className="flex flex-col gap-20">
          {/* Dual Calendar Card */}
          <div className="card-dark p-28 flex flex-col gap-15 border-2 border-[#141414]">
            <h2 className="font-heading text-2xl text-white border-b border-[#222222] pb-10">
              Gregorian &amp; Ethiopian Calendar
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed font-medium">
              Appointments are stored in standard Gregorian format, with companion automatic display in the Ethiopian Calendar (13-month Ge&apos;ez system) for smooth local reference.
            </p>
            <div className="p-15 rounded-card bg-[#141414] border border-[#262626] flex flex-col gap-5">
              <span className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">Today in Addis Ababa:</span>
              <span className="font-heading text-2xl text-[#ff8442]">{dateInfo.combined}</span>
            </div>
          </div>

          {/* Policies Card */}
          <div className="card-light p-28 flex flex-col gap-15 border-2 border-[#141414]">
            <h2 className="font-heading text-2xl text-[#000000] border-b-2 border-[#141414] pb-10">
              Punctuality &amp; Cutoff Policy
            </h2>
            <div className="space-y-12 text-xs text-[#666666] leading-relaxed font-medium">
              <div className="p-12 rounded-card bg-[#faf5ea] border-2 border-[#141414]">
                <p className="font-heading text-lg text-[#000000] mb-2">⏰ Arrive 5 Minutes Early</p>
                <p>Please arrive 5 minutes before your time. Reservations are held for up to 10 minutes past your scheduled start.</p>
              </div>
              <div className="p-12 rounded-card bg-[#faf5ea] border-2 border-[#141414]">
                <p className="font-heading text-lg text-[#6040ff] mb-2">🔄 2-Hour Reschedule Cutoff</p>
                <p>Modify or cancel self-service at zero fee using your secure link up to 2 hours before your slot.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
