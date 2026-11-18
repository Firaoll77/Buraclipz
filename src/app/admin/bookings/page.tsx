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
  paymentPublicId?: string | null;
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

// New bookings store a private Cloudinary public_id served via the
// authenticated media endpoint; legacy records keep paymentScreenshot
// (data: URLs or /uploads/ paths) which render directly.
function hasScreenshot(appt: Appointment) {
  return (
    Boolean(appt.paymentPublicId) ||
    Boolean(appt.paymentScreenshot && appt.paymentScreenshot.trim() !== "")
  );
}

function screenshotSrc(appt: Appointment) {
  if (appt.paymentPublicId) {
    return `/api/admin/media/${appt.paymentPublicId}`;
  }
  return appt.paymentScreenshot || "";
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
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [viewMode, setViewMode] = useState<"active" | "archive">("active");
  const [archiveSubcategory, setArchiveSubcategory] = useState<"completed" | "cancelled" | "all">("completed");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(false);
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
      const params = new URLSearchParams({ t: String(Date.now()) });
      if (!showAll) params.set("date", date);
      const res = await fetch(`/api/admin/appointments?${params}`);
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
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
            className="input-standard text-xs font-semibold py-2 px-3 rounded-xl border border-gray-300 bg-white text-gray-700 hover:border-gray-400 cursor-pointer"
            style={{ minHeight: 40, width: "auto" }}
            aria-label="Sort order"
          >
            <option value="newest">Sort: Newest First ↓</option>
            <option value="oldest">Sort: Oldest First ↑</option>
          </select>
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
      {(() => {
        const activeAppointments = appointments.filter((a) => a.status === "BOOKED");
        const completedAppointments = appointments.filter((a) => a.status === "COMPLETED");
        const cancelledAppointments = appointments.filter((a) => a.status === "CANCELLED");
        const archivedAppointments = appointments.filter((a) => a.status !== "BOOKED");

        const totalActiveAllTime = allAppointments.filter((a) => a.status === "BOOKED").length;
        const totalCompletedAllTime = allAppointments.filter((a) => a.status === "COMPLETED").length;
        const totalCancelledAllTime = allAppointments.filter((a) => a.status === "CANCELLED").length;
        const totalArchivedAllTime = allAppointments.filter((a) => a.status !== "BOOKED").length;

        const displayedAppointments = (() => {
          if (viewMode === "active") {
            return activeAppointments;
          }
          if (archiveSubcategory === "completed") {
            return completedAppointments;
          }
          if (archiveSubcategory === "cancelled") {
            return cancelledAppointments;
          }
          return archivedAppointments;
        })();

        const completedRevenue = completedAppointments.reduce((sum, a) => sum + (a.priceEtb || 0), 0);

        function renderCard(appt: Appointment) {
          const isBooked = appt.status === "BOOKED";
          const isCompleted = appt.status === "COMPLETED";

          return (
            <div
              key={appt.id}
              className="card-standard p-3.5 sm:p-4 cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden"
              onClick={() => setSelectedAppointment(appt)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                {/* Left Side: Time Badge + Details */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Time Badge */}
                  <div
                    className={`shrink-0 text-center rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 min-w-[68px] sm:min-w-[76px] border ${
                      isBooked
                        ? "bg-[#fff8f0] border-[#ff9800]/30 text-[#ff9800]"
                        : isCompleted
                        ? "bg-[#f1f8e9] border-[#43a047]/30 text-[#2e7d32]"
                        : "bg-[#ffebee] border-[#e53935]/30 text-[#c62828]"
                    }`}
                  >
                    <p className="text-xs sm:text-sm font-bold leading-tight">
                      {formatTime(appt.startTime)}
                    </p>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                      {appt.bookingReference}
                    </p>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-[#000] truncate">
                        {appt.customerName}
                      </p>
                      <a
                        href={`tel:${appt.customerPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-[#5b4cff] font-medium hover:underline"
                      >
                        {appt.customerPhone}
                      </a>
                    </div>

                    <p className="text-xs text-[#444] mt-0.5">
                      <span className="font-semibold text-[#000]">{appt.serviceName}</span> &middot; {appt.durationMinutes} min &middot; <span className="font-bold text-[#000]">{appt.priceEtb} ETB</span>
                    </p>

                    <p className="text-[11px] text-[#888] mt-0.5">
                      {formatDate(appt.startTime)} &middot; Booked {formatDateTime(appt.createdAt)}
                    </p>

                    {appt.cancellationReason && (
                      <p className="text-[11px] mt-1 text-[#c62828] bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg inline-block font-medium">
                        Reason: {appt.cancellationReason}
                      </p>
                    )}

                    {hasScreenshot(appt) && (
                      <div className="mt-2 flex items-center gap-2">
                        <img
                          src={screenshotSrc(appt)}
                          alt="Payment screenshot"
                          className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg border cursor-zoom-in shadow-xs"
                          style={{ borderColor: "#e5e5e5" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxSrc(screenshotSrc(appt));
                            setLightboxZoom(false);
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxSrc(screenshotSrc(appt));
                            setLightboxZoom(false);
                          }}
                          className="text-xs text-[#5b4cff] font-medium underline inline-flex items-center gap-1"
                        >
                          <AttachmentIcon size={13} />
                          <span>View Receipt</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Status Badge & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full text-white shadow-xs"
                    style={{ background: STATUS_COLORS[appt.status] || "#999" }}
                  >
                    {appt.status}
                  </span>

                  {isBooked && (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => markStatus(appt.id, "COMPLETED")}
                        disabled={actionId === appt.id}
                        className="text-xs px-3 py-1.5 rounded-xl font-bold disabled:opacity-50 inline-flex items-center gap-1 bg-[#e8f5e9] text-[#2e7d32] hover:bg-[#c8e6c9] active:scale-95 transition-all shadow-xs"
                        style={{ minHeight: 34 }}
                        title="Mark appointment completed"
                      >
                        <CheckmarkCircleIcon size={15} />
                        <span>Done</span>
                      </button>
                      <button
                        onClick={() => markStatus(appt.id, "CANCELLED")}
                        disabled={actionId === appt.id}
                        className="text-xs px-2.5 py-1.5 rounded-xl font-bold disabled:opacity-50 inline-flex items-center gap-1 bg-[#ffebee] text-[#c62828] hover:bg-[#ffcdd2] active:scale-95 transition-all"
                        style={{ minHeight: 34 }}
                        title="Cancel appointment"
                      >
                        <CancelCircleIcon size={15} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {/* View Switcher: Active Queue vs Archive (Touch-friendly & Responsive) */}
            <div className="bg-[#f0efff] p-1 rounded-2xl flex items-center gap-1 border border-[#5b4cff]/20">
              <button
                type="button"
                onClick={() => setViewMode("active")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                  viewMode === "active"
                    ? "bg-[#5b4cff] text-white shadow-sm"
                    : "text-[#5b4cff] hover:bg-white/60"
                }`}
                style={{ minHeight: 42 }}
              >
                <span>✂️ Active Queue</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    viewMode === "active"
                      ? "bg-white text-[#5b4cff]"
                      : "bg-[#5b4cff]/15 text-[#5b4cff]"
                  }`}
                >
                  {activeAppointments.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("archive")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                  viewMode === "archive"
                    ? "bg-[#0f0f14] text-white shadow-sm"
                    : "text-[#444] hover:bg-white/60"
                }`}
                style={{ minHeight: 42 }}
              >
                <span>📦 Archive</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    viewMode === "archive"
                      ? "bg-white text-[#0f0f14]"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {archivedAppointments.length}
                </span>
              </button>
            </div>

            {/* Archive Sub-categories (Pill Bar on Mobile & Desktop) */}
            {viewMode === "archive" && (
              <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setArchiveSubcategory("completed")}
                      className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                        archiveSubcategory === "completed"
                          ? "bg-[#43a047] text-white shadow-xs"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      style={{ minHeight: 34 }}
                    >
                      <span>✅ Completed</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        archiveSubcategory === "completed" ? "bg-white text-[#2e7d32]" : "bg-gray-200 text-gray-700"
                      }`}>
                        {completedAppointments.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setArchiveSubcategory("cancelled")}
                      className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                        archiveSubcategory === "cancelled"
                          ? "bg-[#e53935] text-white shadow-xs"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      style={{ minHeight: 34 }}
                    >
                      <span>❌ Cancelled</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        archiveSubcategory === "cancelled" ? "bg-white text-[#c62828]" : "bg-gray-200 text-gray-700"
                      }`}>
                        {cancelledAppointments.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setArchiveSubcategory("all")}
                      className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                        archiveSubcategory === "all"
                          ? "bg-[#0f0f14] text-white shadow-xs"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      style={{ minHeight: 34 }}
                    >
                      <span>All Archived</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        archiveSubcategory === "all" ? "bg-white text-[#0f0f14]" : "bg-gray-200 text-gray-700"
                      }`}>
                        {archivedAppointments.length}
                      </span>
                    </button>
                  </div>

                  {!showAll && totalArchivedAllTime > archivedAppointments.length && (
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      className="text-xs text-[#5b4cff] hover:underline font-bold self-start sm:self-auto shrink-0 inline-flex items-center gap-1"
                    >
                      <span>View All-Time Archive ({totalArchivedAllTime}) →</span>
                    </button>
                  )}
                </div>

                {/* Sub-category Quick Metric Banner */}
                {archiveSubcategory === "completed" && completedAppointments.length > 0 && (
                  <div className="bg-[#e8f5e9]/70 border border-[#c8e6c9] text-[#1b5e20] p-2.5 rounded-xl flex items-center justify-between text-xs sm:text-sm font-medium">
                    <span>Haircuts Finished: <strong className="font-bold">{completedAppointments.length}</strong></span>
                    <span>Total Revenue: <strong className="font-bold">{completedRevenue} ETB</strong></span>
                  </div>
                )}
                {archiveSubcategory === "cancelled" && cancelledAppointments.length > 0 && (
                  <div className="bg-[#ffebee]/70 border border-[#ffcdd2] text-[#b71c1c] p-2.5 rounded-xl flex items-center justify-between text-xs sm:text-sm font-medium">
                    <span>Cancelled Bookings: <strong className="font-bold">{cancelledAppointments.length}</strong></span>
                    <span className="text-[11px] opacity-80">Slots reopened for new clients</span>
                  </div>
                )}
              </div>
            )}

            {/* Loading Skeleton */}
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="card-standard p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="shrink-0 flex flex-col items-center gap-2">
                        <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : displayedAppointments.length === 0 ? (
              /* Empty States per tab */
              viewMode === "active" ? (
                <div className="card-standard p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#5b4cff]/10 text-[#5b4cff] flex items-center justify-center mx-auto mb-3">
                    <CheckmarkCircleIcon size={26} />
                  </div>
                  <p className="font-bold text-sm text-[#000]">No active bookings in queue</p>
                  <p className="text-xs text-[#888] mt-1">
                    {!showAll
                      ? "All appointments for this date are completed or archived."
                      : "No active upcoming appointments found."}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    {archivedAppointments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setViewMode("archive")}
                        className="text-xs px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold"
                      >
                        View Completed / Archive ({archivedAppointments.length})
                      </button>
                    )}
                    {!showAll && (
                      <button
                        type="button"
                        onClick={() => setShowAll(true)}
                        className="text-xs px-3.5 py-2 rounded-xl bg-[#5b4cff]/10 hover:bg-[#5b4cff]/20 text-[#5b4cff] font-bold"
                      >
                        View All Dates ({totalActiveAllTime} upcoming)
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="card-standard p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mx-auto mb-3">
                    <ClockIcon size={26} />
                  </div>
                  <p className="font-bold text-sm text-[#000]">
                    No {archiveSubcategory === "all" ? "archived" : archiveSubcategory} appointments
                  </p>
                  <p className="text-xs text-[#888] mt-1">
                    {!showAll
                      ? `No ${archiveSubcategory} records for this date.`
                      : `No ${archiveSubcategory} records found in archive.`}
                  </p>
                  {!showAll && totalArchivedAllTime > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      className="mt-3 text-xs text-[#5b4cff] font-bold underline"
                    >
                      Search All Dates in Archive ({totalArchivedAllTime} total)
                    </button>
                  )}
                </div>
              )
            ) : (
              /* Appointments Render List */
              <div className="space-y-3">
                {showAll ? (
                  (() => {
                    const groupedByDate = displayedAppointments.reduce((acc, appt) => {
                      const dateKey = formatDate(appt.startTime);
                      if (!acc[dateKey]) acc[dateKey] = [];
                      acc[dateKey].push(appt);
                      return acc;
                    }, {} as Record<string, Appointment[]>);

                    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
                      const firstApptA = groupedByDate[a][0];
                      const firstApptB = groupedByDate[b][0];
                      const timeA = new Date(firstApptA.startTime).getTime();
                      const timeB = new Date(firstApptB.startTime).getTime();
                      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
                    });

                    return sortedDates.map((dateKey) => {
                      const appts = groupedByDate[dateKey];
                      const sortedAppts = [...appts].sort((a, b) => {
                        const timeA = new Date(a.startTime).getTime();
                        const timeB = new Date(b.startTime).getTime();
                        return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
                      });

                      return (
                        <div key={dateKey} className="space-y-2">
                          <h3 className="text-xs sm:text-sm font-bold text-gray-500 px-1 pt-2 flex items-center justify-between">
                            <span>{dateKey}</span>
                            <span className="text-[11px] font-normal text-gray-400">{sortedAppts.length} appointments</span>
                          </h3>
                          <div className="space-y-2.5">
                            {sortedAppts.map((appt) => renderCard(appt))}
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : (
                  [...displayedAppointments]
                    .sort((a, b) => {
                      const timeA = new Date(a.startTime).getTime();
                      const timeB = new Date(b.startTime).getTime();
                      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
                    })
                    .map((appt) => renderCard(appt))
                )}
              </div>
            )}
          </div>
        );
      })()}

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
              
              {hasScreenshot(selectedAppointment) && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: "#888" }}>Payment Screenshot</p>
                  <div className="border rounded-lg overflow-hidden cursor-zoom-in" style={{ borderColor: "#e5e5e5" }}>
                    <img
                      src={screenshotSrc(selectedAppointment)}
                      alt="Payment screenshot"
                      className="w-full h-auto"
                      style={{ maxHeight: 300 }}
                      onClick={() => {
                        setLightboxSrc(screenshotSrc(selectedAppointment));
                        setLightboxZoom(false);
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLightboxSrc(screenshotSrc(selectedAppointment));
                      setLightboxZoom(false);
                    }}
                    className="text-xs text-[#5b4cff] font-medium underline mt-2 inline-block"
                  >
                    View full size
                  </button>
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

      {/* Screenshot Lightbox — click image to zoom, click outside to close */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
          onClick={() => {
            setLightboxSrc(null);
            setLightboxZoom(false);
          }}
        >
          <button
            type="button"
            onClick={() => {
              setLightboxSrc(null);
              setLightboxZoom(false);
            }}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            aria-label="Close"
          >
            <CloseIcon size={28} />
          </button>
          <div
            className="max-w-full max-h-full overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxSrc}
              alt="Payment screenshot"
              className={`transition-transform duration-200 ${lightboxZoom ? "scale-[1.75]" : "scale-100"} cursor-zoom-in max-w-full max-h-[85vh] object-contain`}
              onClick={() => setLightboxZoom((z) => !z)}
            />
          </div>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/70">
            Click image to zoom · click outside to close
          </p>
        </div>
      )}
    </div>
  );
}

