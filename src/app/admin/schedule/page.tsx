"use client";

import { useEffect, useState, useCallback } from "react";

interface Appointment {
  id: string;
  bookingReference: string;
  customerName: string;
  customerPhone: string;
  barberName: string;
  barberColor?: string;
  serviceName: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  status: "BOOKED" | "COMPLETED" | "CANCELLED";
  priceEtb: number;
  notes?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SLOT_HOUR_START = 8;
const SLOT_HOUR_END = 21;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-ET", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Addis_Ababa",
  });
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toLocalDateStr(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: "Africa/Addis_Ababa" });
}

function minutesFromMidnight(iso: string) {
  const d = new Date(iso);
  const h = d.toLocaleString("en-ET", { hour: "numeric", hour12: false, timeZone: "Africa/Addis_Ababa" });
  const m = d.toLocaleString("en-ET", { minute: "numeric", timeZone: "Africa/Addis_Ababa" });
  return parseInt(h) * 60 + parseInt(m);
}

export default function SchedulePage() {
  const [view, setView] = useState<"day" | "week">("day");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const dateStr = toLocalDateStr(currentDate);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/appointments?date=${dateStr}&t=${Date.now()}`, {
        cache: "no-store",
      });
      const apptData = await res.json();
      setAppointments(apptData.appointments || []);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [dateStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function markStatus(id: string, status: string) {
    await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  }

  const totalHours = SLOT_HOUR_END - SLOT_HOUR_START;
  const PX_PER_HOUR = 64;

  const bookedCount = appointments.filter((a) => a.status === "BOOKED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#000" }}>Shop Schedule</h1>
          <p className="text-sm mt-1" style={{ color: "#666" }}>
            {currentDate.toLocaleDateString("en-ET", {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: "Africa/Addis_Ababa",
            })}{" "}
            &middot; {bookedCount} active {bookedCount === 1 ? "booking" : "bookings"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "#ddd" }}>
            {(["day", "week"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-4 py-2 text-sm font-medium capitalize"
                style={{
                  background: view === v ? "#ff9800" : "white",
                  color: view === v ? "white" : "#333",
                  minHeight: 44,
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <button
            onClick={() => setCurrentDate((d) => addDays(d, view === "day" ? -1 : -7))}
            className="btn-pill px-3 py-2 text-sm"
            style={{ background: "#3A3A3A", color: "white", minHeight: 44 }}
            aria-label="Previous"
          >
            ←
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="btn-pill px-3 py-2 text-sm"
            style={{ background: "#3A3A3A", color: "white", minHeight: 44 }}
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate((d) => addDays(d, view === "day" ? 1 : 7))}
            className="btn-pill px-3 py-2 text-sm"
            style={{ background: "#3A3A3A", color: "white", minHeight: 44 }}
            aria-label="Next"
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card-standard overflow-hidden bg-white shadow-sm border border-gray-200 rounded-2xl">
        {/* Column Header */}
        <div className="flex border-b" style={{ borderColor: "#e5e7eb" }}>
          <div className="w-16 shrink-0 py-3 text-center text-xs font-semibold text-gray-400">
            Time
          </div>
          {view === "day" ? (
            <div
              className="flex-1 text-center py-3 text-sm font-semibold border-l"
              style={{ borderColor: "#e5e7eb", color: "#111827" }}
            >
              Master Timeline &middot; Appointments
            </div>
          ) : (
            Array.from({ length: 7 }, (_, i) => {
              const d = addDays(currentDate, i - currentDate.getDay());
              const isToday = toLocalDateStr(d) === toLocalDateStr(new Date());
              return (
                <div
                  key={i}
                  className="flex-1 text-center py-3 text-sm font-medium border-l"
                  style={{
                    borderColor: "#e5e7eb",
                    color: isToday ? "#ff9800" : "#374151",
                    fontWeight: isToday ? 700 : 500,
                  }}
                >
                  {DAYS[i]}
                  <br />
                  <span className="text-xs font-normal">{d.getDate()}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Time Grid */}
        <div className="relative flex overflow-x-auto">
          {/* Hour labels */}
          <div className="w-16 shrink-0 relative bg-gray-50/50" style={{ height: totalHours * PX_PER_HOUR }}>
            {Array.from({ length: totalHours }, (_, i) => (
              <div
                key={i}
                className="absolute w-full text-right pr-2 text-xs font-medium"
                style={{ top: i * PX_PER_HOUR - 8, color: "#6b7280" }}
              >
                {`${SLOT_HOUR_START + i}:00`}
              </div>
            ))}
          </div>

          {/* Unified Timeline Column (Day View) */}
          {view === "day" ? (
            <div
              className="flex-1 border-l relative"
              style={{ borderColor: "#e5e7eb", height: totalHours * PX_PER_HOUR, minWidth: 260 }}
            >
              {/* Hour divider lines */}
              {Array.from({ length: totalHours }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-full border-t border-gray-100"
                  style={{ top: i * PX_PER_HOUR }}
                />
              ))}

              {/* Day View Appointments */}
              {appointments.map((appt) => {
                const startMin = minutesFromMidnight(appt.startTime);
                const topPx = (startMin - SLOT_HOUR_START * 60) * (PX_PER_HOUR / 60);
                const heightPx = appt.durationMinutes * (PX_PER_HOUR / 60);
                const isCancelled = appt.status === "CANCELLED";
                const isCompleted = appt.status === "COMPLETED";

                const bgColor = isCancelled
                  ? "#9ca3af"
                  : isCompleted
                  ? "#16a34a"
                  : "#5b4cff";

                return (
                  <div
                    key={appt.id}
                    className="absolute left-2 right-2 rounded-xl p-3 text-white shadow-sm transition-all overflow-hidden flex flex-col justify-between"
                    style={{
                      top: Math.max(topPx, 0),
                      height: Math.max(heightPx, 44),
                      background: bgColor,
                      opacity: isCancelled ? 0.45 : 1,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate tracking-tight">{appt.customerName}</p>
                        <p className="text-[11px] text-white/90 truncate">
                          {appt.serviceName} &middot; {appt.durationMinutes}m
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-semibold block leading-tight">
                          {formatTime(appt.startTime)}
                        </span>
                        <span className="text-[10px] text-white/80 block">
                          {appt.priceEtb} ETB
                        </span>
                      </div>
                    </div>

                    {appt.status === "BOOKED" && heightPx >= 55 && (
                      <div className="flex items-center gap-2 pt-1.5 border-t border-white/20 mt-1">
                        <button
                          onClick={() => markStatus(appt.id, "COMPLETED")}
                          className="text-[11px] bg-white text-[#5b4cff] font-bold px-2 py-0.5 rounded-md hover:bg-white/90 transition-colors shadow-xs"
                        >
                          ✓ Complete
                        </button>
                        <span className="text-[10px] text-white/80 uppercase tracking-wide">
                          {appt.bookingReference}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* 7-Day Grid (Week View) */
            Array.from({ length: 7 }, (_, i) => {
              const d = addDays(currentDate, i - currentDate.getDay());
              const dStr = toLocalDateStr(d);
              const dayAppts = appointments.filter(
                (a) => toLocalDateStr(new Date(a.startTime)) === dStr
              );

              return (
                <div
                  key={i}
                  className="flex-1 border-l relative"
                  style={{ borderColor: "#e5e7eb", height: totalHours * PX_PER_HOUR, minWidth: 90 }}
                >
                  {Array.from({ length: totalHours }, (_, h) => (
                    <div
                      key={h}
                      className="absolute w-full border-t border-gray-100"
                      style={{ top: h * PX_PER_HOUR }}
                    />
                  ))}
                  {dayAppts.map((appt) => {
                    const startMin = minutesFromMidnight(appt.startTime);
                    const topPx = (startMin - SLOT_HOUR_START * 60) * (PX_PER_HOUR / 60);
                    const heightPx = appt.durationMinutes * (PX_PER_HOUR / 60);

                    return (
                      <div
                        key={appt.id}
                        className="absolute left-1 right-1 rounded-lg p-1.5 overflow-hidden text-white shadow-xs"
                        style={{
                          top: Math.max(topPx, 0),
                          height: Math.max(heightPx, 30),
                          background:
                            appt.status === "COMPLETED"
                              ? "#16a34a"
                              : appt.status === "CANCELLED"
                              ? "#9ca3af"
                              : "#5b4cff",
                          opacity: appt.status === "CANCELLED" ? 0.45 : 1,
                        }}
                      >
                        <p className="text-[11px] font-bold truncate leading-tight">{appt.customerName}</p>
                        <p className="text-[10px] text-white/85 truncate">{formatTime(appt.startTime)}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {loading && (
        <p className="text-center text-sm" style={{ color: "#888" }}>
          Loading schedule…
        </p>
      )}
    </div>
  );
}
