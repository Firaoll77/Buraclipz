"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toEthiopianDate } from "@/lib/ethiopian-calendar";
import {
  RefreshIcon,
  ClockIcon,
  AttachmentIcon,
  CheckmarkCircleIcon,
  CancelCircleIcon,
  CloseIcon,
} from "@/components/icons/Hugeicons";

interface Appointment {
  id: string;
  bookingReference: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  barberName: string;
  serviceName: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  status: "BOOKED" | "COMPLETED" | "CANCELLED";
  priceEtb: number;
  notes?: string;
  paymentScreenshot?: string;
  createdAt: string;
  cancellationReason?: string;
}

interface Barber { id: string; name: string; }
interface Service { id: string; name: string; durationMinutes: number; priceEtb: number; }

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-ET", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Africa/Addis_Ababa",
  });
}

function formatDate(iso: string) {
  const ethDate = toEthiopianDate(iso);
  return ethDate.formatted;
}

function formatDateTime(iso: string) {
  const ethDate = toEthiopianDate(iso);
  const time = new Date(iso).toLocaleTimeString("en-ET", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Africa/Addis_Ababa",
  });
  return `${ethDate.formatted} at ${time}`;
}

function toLocalDateStr(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: "Africa/Addis_Ababa" });
}

const STATUS_COLORS: Record<string, string> = {
  BOOKED: "#ff9800",
  COMPLETED: "#43a047",
  CANCELLED: "#e53935",
};

export default function BookingsPage() {
  const [date, setDate] = useState(toLocalDateStr(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [newBookingCount, setNewBookingCount] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const initialLoadRef = useRef(false);
  const seenBookingIdsRef = useRef<Set<string>>(new Set());

  // New booking form state
  const [form, setForm] = useState({
    barberId: "", serviceId: "", date: toLocalDateStr(new Date()),
    startTime: "09:00", customerName: "", customerPhone: "+251",
    customerEmail: "", notes: "", isWalkIn: false,
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const fetchAppointments = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await fetch(`/api/admin/appointments${showAll ? '' : `?date=${date}`}&t=${Date.now()}`);
      const data = await res.json();
      const viewAppts = data.appointments || [];
      setAppointments(viewAppts);

      // Fetch all to track incoming bookings
      const allRes = await fetch(`/api/admin/appointments?t=${Date.now()}`);
      const allData = await allRes.json();
      const allAppts = allData.appointments || [];
      setAllAppointments(allAppts);

      const currentIds = allAppts.map((a: Appointment) => a.id);

      if (!initialLoadRef.current) {
        // Initial load: record existing bookings as seen so demo bookings are not shown as "new"
        seenBookingIdsRef.current = new Set(currentIds);
        initialLoadRef.current = true;
        setNewBookingCount(0);
      } else {
        // Subsequent fetch: detect genuinely new bookings
        const newIds = currentIds.filter((id: string) => !seenBookingIdsRef.current.has(id));
        if (newIds.length > 0) {
          setNewBookingCount((prev) => prev + newIds.length);
          newIds.forEach((id: string) => seenBookingIdsRef.current.add(id));
        }
      }
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [date, showAll]);

  useEffect(() => {
    fetchAppointments(false);
  }, [fetchAppointments]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/barbers").then(r => r.json()),
      fetch("/api/admin/services").then(r => r.json()),
    ]).then(([b, s]) => {
      setBarbers(b.barbers || []);
      setServices(s.services || []);
    });
  }, []);

  async function markStatus(id: string, status: string) {
    setActionId(id);
    await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setActionId(null);
    fetchAppointments();
  }

  async function handleNewBooking(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create booking");
      } else {
        setShowNewForm(false);
        // If created booking has a different date, switch to that date or view all
        if (!showAll && form.date !== date) {
          setDate(form.date);
        }
        setForm({ ...form, customerName: "", customerPhone: "+251", customerEmail: "", notes: "" });
        fetchAppointments();
      }
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" style={{ color: "#000" }}>Bookings</h1>
            {newBookingCount > 0 && (
              <button
                onClick={() => setNewBookingCount(0)}
                className="bg-[#ff9800] text-white text-xs font-bold px-3 py-1 rounded-full hover:bg-[#f57c00] transition-colors"
              >
                {newBookingCount} new (dismiss)
              </button>
            )}
          </div>
          {lastUpdated && (
            <span className="text-[11px] text-gray-500 font-medium">
              Checked {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              setShowAll(false);
              setDate(toLocalDateStr(new Date()));
            }}
            className={`text-xs px-3 py-2 rounded-xl font-medium transition-colors ${!showAll ? 'bg-[#5b4cff] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Today
          </button>
          <button
            onClick={() => {
              setShowAll(true);
            }}
            className={`text-xs px-3 py-2 rounded-xl font-medium transition-colors ${showAll ? 'bg-[#5b4cff] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            All Bookings
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setShowAll(false);
            }}
            className="input-standard text-xs"
            style={{ minHeight: 40, width: "auto" }}
          />
          <button
            onClick={() => fetchAppointments(true)}
            disabled={loading || isRefreshing}
            className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl font-medium border transition-all ${
              isRefreshing
                ? "bg-[#5b4cff]/10 border-[#5b4cff] text-[#5b4cff]"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
            style={{ minHeight: 40 }}
            title="Fetch new bookings"
          >
            <RefreshIcon size={15} className={isRefreshing ? "animate-spin" : ""} />
            <span>{isRefreshing ? "Refreshing…" : "Refresh"}</span>
          </button>
          <button
            onClick={() => setShowNewForm(true)}
            className="btn-pill px-4 py-2 font-semibold text-white text-sm"
            style={{ background: "#ff9800", minHeight: 40 }}
          >
            + New Booking
          </button>
        </div>
      </div>

      {/* Loading window during manual refresh */}
      {isRefreshing && (
        <div className="bg-[#f4f2ff] border border-[#5b4cff]/40 text-[#5b4cff] px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-2.5">
            <ClockIcon size={16} className="animate-spin text-[#5b4cff]" />
            <span className="text-xs font-semibold">
              Fetching latest customer bookings and payment receipts from database…
            </span>
          </div>
          <span className="text-[11px] font-mono opacity-80">Syncing</span>
        </div>
      )}

      {/* New Booking / Walk-in Form */}
      {showNewForm && (
        <div className="card-standard p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold" style={{ color: "#000" }}>
              {form.isWalkIn ? "Walk-in" : "Manual Booking"}
            </h2>
            <button onClick={() => setShowNewForm(false)} className="text-gray-400 hover:text-gray-600">
              <CloseIcon size={20} />
            </button>
          </div>

          <form onSubmit={handleNewBooking} className="space-y-4">
            {/* Walk-in toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isWalkIn}
                onChange={(e) => setForm({ ...form, isWalkIn: e.target.checked })}
                className="w-5 h-5"
              />
              <span className="text-sm font-medium" style={{ color: "#000" }}>Walk-in (skip availability check)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#555" }}>Barber *</label>
                <select
                  className="input-standard w-full"
                  value={form.barberId}
                  onChange={(e) => setForm({ ...form, barberId: e.target.value })}
                  required
                >
                  <option value="">Select barber…</option>
                  {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#555" }}>Service *</label>
                <select
                  className="input-standard w-full"
                  value={form.serviceId}
                  onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                  required
                >
                  <option value="">Select service…</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes}min)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#555" }}>Date *</label>
                <input
                  type="date"
                  className="input-standard w-full"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#555" }}>Start Time *</label>
                <input
                  type="time"
                  className="input-standard w-full"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#555" }}>Customer Name *</label>
                <input
                  className="input-standard w-full"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="Full name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#555" }}>Phone *</label>
                <input
                  className="input-standard w-full"
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  placeholder="+251 9XX XXX XXX"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#555" }}>Email</label>
                <input
                  type="email"
                  className="input-standard w-full"
                  value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  placeholder="optional"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#555" }}>Notes</label>
                <input
                  className="input-standard w-full"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="optional"
                />
              </div>
            </div>

            {formError && (
              <p className="text-sm" style={{ color: "#d32f2f" }}>{formError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={formLoading}
                className="btn-pill px-6 py-2 font-semibold text-white text-sm disabled:opacity-50"
                style={{ background: "#ff9800", minHeight: 44 }}
              >
                {formLoading ? "Saving…" : form.isWalkIn ? "Add Walk-in" : "Create Booking"}
              </button>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="btn-pill px-6 py-2 font-semibold text-sm"
                style={{ background: "#e0e0e0", color: "#333", minHeight: 44 }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Appointments List */}
      {loading ? (
        <p className="text-sm text-center" style={{ color: "#888" }}>Loading…</p>
      ) : appointments.length === 0 && !showAll ? (
        <div className="card-standard p-10 text-center">
          <p style={{ color: "#888" }}>No appointments for this date</p>
          <button
            onClick={() => setShowAll(true)}
            className="mt-3 text-sm text-[#5b4cff] font-medium underline"
          >
            View all bookings instead
          </button>
        </div>
      ) : showAll && appointments.length === 0 ? (
        <div className="card-standard p-10 text-center">
          <p style={{ color: "#888" }}>No upcoming bookings</p>
          <button
            onClick={() => setShowAll(false)}
            className="mt-3 text-sm text-[#5b4cff] font-medium underline"
          >
            View today's appointments
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {showAll ? (
            // Group by date when showing all
            (() => {
              const groupedByDate = appointments.reduce((acc, appt) => {
                const dateKey = formatDate(appt.startTime);
                if (!acc[dateKey]) {
                  acc[dateKey] = [];
                }
                acc[dateKey].push(appt);
                return acc;
              }, {} as Record<string, Appointment[]>);

              // Sort dates chronologically
              const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
                const firstApptA = groupedByDate[a][0];
                const firstApptB = groupedByDate[b][0];
                return new Date(firstApptA.startTime).getTime() - new Date(firstApptB.startTime).getTime();
              });

              return sortedDates.map((date) => {
                const appts = groupedByDate[date];
                const sortedAppts = [...appts].sort((a, b) =>
                  new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                );

                return (
                  <div key={date}>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: "#666" }}>
                      {date}
                    </h3>
                    <div className="space-y-3">
                      {sortedAppts.map((appt) => (
                        <div
                          key={appt.id}
                          className="card-standard p-4 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setSelectedAppointment(appt)}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="shrink-0 text-center">
                              <p className="text-sm font-bold" style={{ color: "#ff9800" }}>
                                {formatTime(appt.startTime)}
                              </p>
                              <p className="text-xs" style={{ color: "#999" }}>{formatDate(appt.startTime)}</p>
                              <p className="text-xs font-mono" style={{ color: "#888" }}>{appt.bookingReference}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm" style={{ color: "#000" }}>{appt.customerName}</p>
                              <p className="text-xs" style={{ color: "#666" }}>
                                Phone: {appt.customerPhone}
                              </p>
                              <p className="text-xs" style={{ color: "#444" }}>
                                {appt.serviceName} {appt.durationMinutes}min {appt.priceEtb} ETB
                              </p>
                              <p className="text-xs" style={{ color: "#666" }}>
                                {appt.barberName}
                              </p>
                              <p className="text-xs" style={{ color: "#888" }}>
                                Booked: {formatDateTime(appt.createdAt)}
                              </p>
                              {appt.paymentScreenshot && appt.paymentScreenshot.trim() !== "" && (
                                <div className="mt-2">
                                  <img
                                    src={appt.paymentScreenshot}
                                    alt="Payment screenshot"
                                    className="w-24 h-24 object-cover rounded border"
                                    style={{ borderColor: "#e5e5e5" }}
                                    onClick={(e) => e.stopPropagation()}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const link = e.currentTarget.nextElementSibling as HTMLElement;
                                      if (link) link.style.display = 'none';
                                    }}
                                  />
                                  <a
                                    href={appt.paymentScreenshot}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs text-[#5b4cff] font-medium underline inline-flex items-center gap-1"
                                  >
                                    <AttachmentIcon size={13} />
                                    <span>View Payment Screenshot →</span>
                                  </a>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className="text-xs font-medium px-2 py-1 rounded-full text-white"
                                style={{ background: STATUS_COLORS[appt.status] || "#999" }}
                              >
                                {appt.status}
                              </span>
                              {appt.status === "BOOKED" && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markStatus(appt.id, "COMPLETED");
                                    }}
                                    disabled={actionId === appt.id}
                                    className="text-xs px-3 py-1.5 rounded-xl font-medium disabled:opacity-50 inline-flex items-center gap-1"
                                    style={{ background: "#e8f5e9", color: "#2e7d32", minHeight: 32 }}
                                  >
                                    <CheckmarkCircleIcon size={14} />
                                    <span>Done</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markStatus(appt.id, "CANCELLED");
                                    }}
                                    disabled={actionId === appt.id}
                                    className="text-xs px-3 py-1.5 rounded-xl font-medium disabled:opacity-50 inline-flex items-center gap-1"
                                    style={{ background: "#fce4e4", color: "#c62828", minHeight: 32 }}
                                  >
                                    <CancelCircleIcon size={14} />
                                    <span>Cancel</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()
          ) : (
            // Simple list when showing specific date - sorted by time
            [...appointments].sort((a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            ).map((appt) => (
              <div
                key={appt.id}
                className="card-standard p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedAppointment(appt)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="shrink-0 text-center">
                    <p className="text-sm font-bold" style={{ color: "#ff9800" }}>
                      {formatTime(appt.startTime)}
                    </p>
                    <p className="text-xs" style={{ color: "#999" }}>{formatDate(appt.startTime)}</p>
                    <p className="text-xs font-mono" style={{ color: "#888" }}>{appt.bookingReference}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: "#000" }}>{appt.customerName}</p>
                    <p className="text-xs" style={{ color: "#666" }}>
                      Phone: {appt.customerPhone}
                    </p>
                    <p className="text-xs" style={{ color: "#444" }}>
                      {appt.serviceName} {appt.durationMinutes}min {appt.priceEtb} ETB
                    </p>
                    <p className="text-xs" style={{ color: "#666" }}>
                      {appt.barberName}
                    </p>
                    <p className="text-xs" style={{ color: "#888" }}>
                      Booked: {formatDateTime(appt.createdAt)}
                    </p>
                    {appt.paymentScreenshot && appt.paymentScreenshot.trim() !== "" && (
                      <div className="mt-2">
                        <img
                          src={appt.paymentScreenshot}
                          alt="Payment screenshot"
                          className="w-24 h-24 object-cover rounded border"
                          style={{ borderColor: "#e5e5e5" }}
                          onClick={(e) => e.stopPropagation()}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const link = e.currentTarget.nextElementSibling as HTMLElement;
                            if (link) link.style.display = 'none';
                          }}
                        />
                        <a
                          href={appt.paymentScreenshot}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-[#5b4cff] font-medium underline inline-flex items-center gap-1"
                        >
                          <AttachmentIcon size={13} />
                          <span>View Payment Screenshot →</span>
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-xs font-medium px-2 py-1 rounded-full text-white"
                      style={{ background: STATUS_COLORS[appt.status] || "#999" }}
                    >
                      {appt.status}
                    </span>
                    {appt.status === "BOOKED" && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markStatus(appt.id, "COMPLETED");
                          }}
                          disabled={actionId === appt.id}
                          className="text-xs px-3 py-1.5 rounded-xl font-medium disabled:opacity-50 inline-flex items-center gap-1"
                          style={{ background: "#e8f5e9", color: "#2e7d32", minHeight: 32 }}
                        >
                          <CheckmarkCircleIcon size={14} />
                          <span>Done</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markStatus(appt.id, "CANCELLED");
                          }}
                          disabled={actionId === appt.id}
                          className="text-xs px-3 py-1.5 rounded-xl font-medium disabled:opacity-50 inline-flex items-center gap-1"
                          style={{ background: "#fce4e4", color: "#c62828", minHeight: 32 }}
                        >
                          <CancelCircleIcon size={14} />
                          <span>Cancel</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedAppointment(null)}>
          <div className="card-standard p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: "#000" }}>Booking Details</h2>
              <button onClick={() => setSelectedAppointment(null)} className="text-gray-400 hover:text-gray-600">
                <CloseIcon size={22} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium" style={{ color: "#888" }}>Booking Reference</p>
                <p className="text-sm font-mono font-bold" style={{ color: "#000" }}>{selectedAppointment.bookingReference}</p>
              </div>
              
              <div>
                <p className="text-xs font-medium" style={{ color: "#888" }}>Customer</p>
                <p className="text-sm font-semibold" style={{ color: "#000" }}>{selectedAppointment.customerName}</p>
                <p className="text-sm" style={{ color: "#666" }}>{selectedAppointment.customerPhone}</p>
                {selectedAppointment.customerEmail && (
                  <p className="text-sm" style={{ color: "#666" }}>{selectedAppointment.customerEmail}</p>
                )}
              </div>
              
              <div>
                <p className="text-xs font-medium" style={{ color: "#888" }}>Service</p>
                <p className="text-sm font-semibold" style={{ color: "#000" }}>{selectedAppointment.serviceName}</p>
                <p className="text-sm" style={{ color: "#666" }}>
                  {selectedAppointment.durationMinutes} min {selectedAppointment.priceEtb} ETB
                </p>
              </div>
              
              <div>
                <p className="text-xs font-medium" style={{ color: "#888" }}>Barber</p>
                <p className="text-sm" style={{ color: "#000" }}>{selectedAppointment.barberName}</p>
              </div>
              
              <div>
                <p className="text-xs font-medium" style={{ color: "#888" }}>Date & Time</p>
                <p className="text-sm" style={{ color: "#000" }}>{formatDate(selectedAppointment.startTime)}</p>
                <p className="text-sm" style={{ color: "#000" }}>{formatTime(selectedAppointment.startTime)}</p>
              </div>
              
              <div>
                <p className="text-xs font-medium" style={{ color: "#888" }}>Status</p>
                <span
                  className="text-xs font-medium px-3 py-1 rounded-full text-white"
                  style={{ background: STATUS_COLORS[selectedAppointment.status] || "#999" }}
                >
                  {selectedAppointment.status}
                </span>
              </div>
              
              <div>
                <p className="text-xs font-medium" style={{ color: "#888" }}>Booked At</p>
                <p className="text-sm" style={{ color: "#000" }}>{formatDateTime(selectedAppointment.createdAt)}</p>
              </div>
              
              {selectedAppointment.paymentScreenshot && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: "#888" }}>Payment Screenshot</p>
                  <div className="border rounded-lg overflow-hidden" style={{ borderColor: "#e5e5e5" }}>
                    <img
                      src={selectedAppointment.paymentScreenshot}
                      alt="Payment screenshot"
                      className="w-full h-auto"
                      style={{ maxHeight: 300 }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <a
                    href={selectedAppointment.paymentScreenshot}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#5b4cff] font-medium underline mt-2 inline-block"
                  >
                    Open in new tab →
                  </a>
                </div>
              )}
              
              {selectedAppointment.notes && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: "#888" }}>Notes</p>
                  <p className="text-sm italic" style={{ color: "#888" }}>{selectedAppointment.notes}</p>
                </div>
              )}
              
              {selectedAppointment.cancellationReason && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: "#888" }}>Cancellation Reason</p>
                  <p className="text-sm" style={{ color: "#c62828" }}>{selectedAppointment.cancellationReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

