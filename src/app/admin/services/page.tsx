"use client";

import { useEffect, useState } from "react";
import {
  ScissorsIcon,
  CloseIcon,
  AlertTriangleIcon,
} from "@/components/icons/Hugeicons";

interface Service {
  id: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  priceEtb: number;
  isActive: boolean;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", durationMinutes: 30, priceEtb: 200 });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Custom Alert Cardboard Modal state (replaces native "localhost says" browser dialog)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchServices() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/services?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Pragma": "no-cache" }
      });
      const data = await res.json();
      setServices(data.services || []);
    } catch (err) {
      console.error("Failed to fetch services:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchServices();
  }, []);

  function startEdit(s: Service) {
    setEditId(s.id);
    setForm({ name: s.name, description: s.description || "", durationMinutes: s.durationMinutes, priceEtb: s.priceEtb });
    setFormError("");
    setShowForm(true);
  }

  function startNew() {
    setEditId(null);
    setForm({ name: "", description: "", durationMinutes: 30, priceEtb: 200 });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const url = editId ? `/api/admin/services/${editId}` : "/api/admin/services";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, durationMinutes: Number(form.durationMinutes), priceEtb: Number(form.priceEtb) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save");
      } else {
        setShowForm(false);
        await fetchServices();
      }
    } catch {
      setFormError("Network error: failed to save");
    } finally {
      setFormLoading(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        await fetchServices();
      }
    } catch (err) {
      console.error("Failed to toggle service status:", err);
    }
  }

  function promptDelete(s: Service) {
    setConfirmDelete({ id: s.id, name: s.name });
  }

  async function executeDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/services/${confirmDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConfirmDelete(null);
        await fetchServices();
      }
    } catch (err) {
      console.error("Failed to delete service:", err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "#000" }}>Services</h1>
        <button
          onClick={startNew}
          className="btn-pill px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "#ff9800", minHeight: 44 }}
        >
          + Add Service
        </button>
      </div>

      {showForm && (
        <div className="card-standard p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold" style={{ color: "#000" }}>
              {editId ? "Edit Service" : "New Service"}
            </h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <CloseIcon size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: "#555" }}>Service Name *</label>
                <input className="input-standard w-full" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#555" }}>Duration (minutes) *</label>
                <input type="number" min={5} max={480} className="input-standard w-full"
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#555" }}>Price (ETB) *</label>
                <input type="number" min={0} step={10} className="input-standard w-full"
                  value={form.priceEtb}
                  onChange={(e) => setForm({ ...form, priceEtb: Number(e.target.value) })} required />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: "#555" }}>Description</label>
                <textarea className="input-standard w-full" rows={2} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            {formError && <p className="text-sm" style={{ color: "#d32f2f" }}>{formError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={formLoading}
                className="btn-pill px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#ff9800", minHeight: 44 }}>
                {formLoading ? "Saving…" : editId ? "Save Changes" : "Add Service"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="btn-pill px-6 py-2 text-sm font-semibold"
                style={{ background: "#e0e0e0", color: "#333", minHeight: 44 }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-center text-sm" style={{ color: "#888" }}>Loading…</p>
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <div key={s.id} className="card-standard p-4 flex items-center gap-4">
              <div
                className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                style={{ background: "#fff3e0" }}
              >
                <ScissorsIcon size={22} className="text-[#ff9800]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: s.isActive ? "#000" : "#999" }}>
                  {s.name}
                  {!s.isActive && <span className="text-xs ml-2" style={{ color: "#e53935" }}>Inactive (Hidden)</span>}
                </p>
                <p className="text-xs" style={{ color: "#444" }}>
                  {s.durationMinutes} min &middot; {s.priceEtb} ETB
                </p>
                {s.description && (
                  <p className="text-xs mt-1 line-clamp-1" style={{ color: "#888" }}>{s.description}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(s)}
                  className="text-xs px-3 py-1.5 rounded-xl font-medium"
                  style={{ background: "#f0f0f0", color: "#333", minHeight: 32 }}>
                  Edit
                </button>
                <button onClick={() => toggleActive(s.id, s.isActive)}
                  className="text-xs px-3 py-1.5 rounded-xl font-medium"
                  style={{
                    background: s.isActive ? "#fce4e4" : "#e8f5e9",
                    color: s.isActive ? "#c62828" : "#2e7d32",
                    minHeight: 32,
                  }}>
                  {s.isActive ? "Hide" : "Show"}
                </button>
                <button onClick={() => promptDelete(s)}
                  className="text-xs px-3 py-1.5 rounded-xl font-medium transition-colors hover:bg-red-50"
                  style={{
                    background: "#f3f4f6",
                    color: "#dc2626",
                    minHeight: 32,
                  }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          RESPONSIVE ALERT CARDBOARD MODAL
          Replaces the native browser popup ("localhost says")
          ───────────────────────────────────────────────────────────── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => !deleting && setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden p-6 sm:p-7 flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            {/* Header with Alert Icon & Details */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-2xl shrink-0 border border-red-100">
                <AlertTriangleIcon size={24} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h3 id="alert-dialog-title" className="text-lg font-bold text-gray-900 leading-snug">
                  Delete Service
                </h3>
                <p id="alert-dialog-description" className="text-sm text-gray-600 mt-1 leading-relaxed">
                  Are you sure you want to delete <strong className="text-gray-900 font-semibold">{confirmDelete.name}</strong>?
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  This will remove the service from the public booking options and admin catalog.
                </p>
              </div>
            </div>

            {/* Responsive Actions: No and Yes */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDelete(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-medium text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors text-center"
              >
                No
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={executeDelete}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm text-center disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
