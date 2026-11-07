"use client";

import { useEffect, useState } from "react";

interface WorkingHours {
  id: string;
  barberId: string;
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string;
  endTime: string;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
}

interface Barber { id: string; name: string; color?: string | null; }

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function HoursPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>("");
  const [hours, setHours] = useState<WorkingHours[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/barbers").then(r => r.json()).then(data => {
      const b = data.barbers || [];
      setBarbers(b);
      if (b.length > 0) setSelectedBarber(b[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedBarber) return;
    setLoading(true);
    fetch(`/api/admin/working-hours?barberId=${selectedBarber}`)
      .then(r => r.json())
      .then(data => {
        const existing = data.workingHours || [];
        // Fill in any missing days
        const filled: WorkingHours[] = DAYS.map((_, i) => {
          const found = existing.find((h: WorkingHours) => h.dayOfWeek === i && h.barberId === selectedBarber);
          return found || {
            id: `new-${selectedBarber}-${i}`,
            barberId: selectedBarber,
            dayOfWeek: i,
            isOpen: i >= 1 && i <= 6, // Mon-Sat open by default
            startTime: i === 0 ? "10:00" : "09:00",
            endTime: i === 0 ? "18:00" : "20:00",
            breakStartTime: "13:00",
            breakEndTime: "14:00",
          };
        });
        setHours(filled);
      })
      .finally(() => setLoading(false));
  }, [selectedBarber]);

  function updateHour(dayOfWeek: number, patch: Partial<WorkingHours>) {
    setHours(prev => prev.map(h => h.dayOfWeek === dayOfWeek ? { ...h, ...patch } : h));
  }

  async function saveDay(dayOfWeek: number) {
    const wh = hours.find(h => h.dayOfWeek === dayOfWeek);
    if (!wh) return;
    setSaving(dayOfWeek);
    try {
      await fetch("/api/admin/working-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId: selectedBarber,
          dayOfWeek,
          isOpen: wh.isOpen,
          startTime: wh.startTime,
          endTime: wh.endTime,
          breakStartTime: wh.breakStartTime || null,
          breakEndTime: wh.breakEndTime || null,
        }),
      });
      setSaved(dayOfWeek);
      setTimeout(() => setSaved(null), 2000);
    } finally {
      setSaving(null);
    }
  }

  const barber = barbers.find(b => b.id === selectedBarber);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: "#000" }}>Working Hours</h1>
        </div>
        <select
          className="input-standard"
          value={selectedBarber}
          onChange={(e) => setSelectedBarber(e.target.value)}
          style={{ minHeight: 44, minWidth: 180 }}
        >
          {barbers.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {barber && (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ background: barber.color || "#ff9800" }}
          >
            {barber.name.charAt(0)}
          </div>
          <span className="font-medium text-sm" style={{ color: "#000" }}>{barber.name}</span>
        </div>
      )}

      {loading ? (
        <p className="text-center text-sm" style={{ color: "#888" }}>Loading…</p>
      ) : (
        <div className="space-y-3">
          {hours.map((wh) => (
            <div key={wh.dayOfWeek} className="card-standard p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Day + Open toggle */}
                <div className="flex items-center gap-3 shrink-0" style={{ minWidth: 160 }}>
                  <button
                    onClick={() => updateHour(wh.dayOfWeek, { isOpen: !wh.isOpen })}
                    className="w-10 h-6 rounded-full relative transition-colors"
                    style={{ background: wh.isOpen ? "#ff9800" : "#ccc" }}
                    aria-label={wh.isOpen ? "Close" : "Open"}
                  >
                    <span
                      className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: wh.isOpen ? "calc(100% - 20px)" : 4 }}
                    />
                  </button>
                  <span className="text-sm font-semibold" style={{ color: wh.isOpen ? "#000" : "#aaa" }}>
                    {DAYS[wh.dayOfWeek]}
                  </span>
                </div>

                {/* Times */}
                {wh.isOpen ? (
                  <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      <label className="text-xs" style={{ color: "#666" }}>Open</label>
                      <input type="time" className="input-standard text-sm px-2 py-1"
                        value={wh.startTime}
                        onChange={(e) => updateHour(wh.dayOfWeek, { startTime: e.target.value })} />
                    </div>
                    <span style={{ color: "#bbb" }}>—</span>
                    <div className="flex items-center gap-2">
                      <label className="text-xs" style={{ color: "#666" }}>Close</label>
                      <input type="time" className="input-standard text-sm px-2 py-1"
                        value={wh.endTime}
                        onChange={(e) => updateHour(wh.dayOfWeek, { endTime: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs" style={{ color: "#666" }}>Break</label>
                      <input type="time" className="input-standard text-sm px-2 py-1"
                        value={wh.breakStartTime || ""}
                        onChange={(e) => updateHour(wh.dayOfWeek, { breakStartTime: e.target.value || null })} />
                      <span style={{ color: "#bbb" }}>—</span>
                      <input type="time" className="input-standard text-sm px-2 py-1"
                        value={wh.breakEndTime || ""}
                        onChange={(e) => updateHour(wh.dayOfWeek, { breakEndTime: e.target.value || null })} />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm flex-1" style={{ color: "#aaa" }}>Closed</p>
                )}

                {/* Save */}
                <button
                  onClick={() => saveDay(wh.dayOfWeek)}
                  disabled={saving === wh.dayOfWeek}
                  className="btn-pill px-4 py-1.5 text-sm font-medium text-white shrink-0 disabled:opacity-50"
                  style={{
                    background: saved === wh.dayOfWeek ? "#43a047" : "#ff9800",
                    minHeight: 36,
                  }}
                >
                  {saving === wh.dayOfWeek ? "Saving…" : saved === wh.dayOfWeek ? "✓ Saved" : "Save"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

