"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardData {
  stats: {
    todayTotal: number;
    todayBooked: number;
    todayCompleted: number;
    todayCancelled: number;
    totalBarbers: number;
    totalServices: number;
  };
  today: Array<{
    id: string;
    bookingReference: string;
    customerName: string;
    customerPhone: string;
    barberName: string;
    serviceName: string;
    startTime: string;
    endTime: string;
    status: string;
    priceEtb: number;
  }>;
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="card-standard p-5">
      <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "#666" }}>
        {label}
      </p>
      <p className="text-3xl font-bold" style={{ color: "#000" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "#888" }}>{sub}</p>}
    </div>
  );
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; label: string }> = {
    BOOKED: { bg: "#ff9800", label: "Booked" },
    COMPLETED: { bg: "#43a047", label: "Completed" },
    CANCELLED: { bg: "#e53935", label: "Cancelled" },
  };
  const s = map[status] || { bg: "#999", label: status };
  return (
    <span
      className="text-xs font-medium px-2 py-1 rounded-full text-white"
      style={{ background: s.bg }}
    >
      {s.label}
    </span>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-ET", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Addis_Ababa",
  });
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const todayLabel = new Date().toLocaleDateString("en-ET", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Africa/Addis_Ababa",
  });

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: "#666" }}>Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card-standard p-6 text-center">
        <p style={{ color: "#d32f2f" }}>{error || "No data"}</p>
      </div>
    );
  }

  const { stats, today } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#000" }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "#666" }}>{todayLabel}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Today's Bookings" value={stats.todayTotal} />
        <StatCard label="Booked" value={stats.todayBooked} sub="active appointments" />
        <StatCard label="Completed" value={stats.todayCompleted} sub="today" />
        <StatCard label="Cancelled" value={stats.todayCancelled} sub="today" />
        <StatCard label="Barbers" value={stats.totalBarbers} sub="active staff" />
        <StatCard label="Services" value={stats.totalServices} sub="active menu" />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/admin/bookings", label: "New Booking", icon: "➕" },
          { href: "/admin/schedule", label: "Today's Schedule", icon: "📅" },
          { href: "/admin/blocked", label: "Block Time", icon: "🚫" },
          { href: "/admin/services", label: "Edit Services", icon: "💈" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="card-standard p-4 flex flex-col items-center gap-2 text-center hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">{link.icon}</span>
            <span className="text-xs font-medium" style={{ color: "#333" }}>{link.label}</span>
          </Link>
        ))}
      </div>

      {/* Today's Appointments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "#000" }}>Today&rsquo;s Appointments</h2>
          <Link href="/admin/schedule" className="text-sm font-medium" style={{ color: "#ff9800" }}>
            Full Schedule →
          </Link>
        </div>

        {today.length === 0 ? (
          <div className="card-standard p-8 text-center">
            <p style={{ color: "#888" }}>No appointments today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {today.map((appt) => (
              <div
                key={appt.id}
                className="card-standard p-4 flex items-center gap-4"
              >
                <div
                  className="shrink-0 text-center rounded-xl px-3 py-2"
                  style={{ background: "#fff3e0", minWidth: 60 }}
                >
                  <p className="text-xs font-medium" style={{ color: "#ff9800" }}>
                    {formatTime(appt.startTime)}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: "#000" }}>
                    {appt.customerName}
                  </p>
                  <p className="text-xs truncate" style={{ color: "#666" }}>
                    {appt.serviceName} &middot; {appt.barberName}
                  </p>
                </div>
                <div className="shrink-0">
                  {statusBadge(appt.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

