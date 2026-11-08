"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatETB, formatDualDate, toEthiopianDate } from "@/lib/ethiopian-calendar";
import { getAddisDateString } from "@/lib/date-utils";
import {
  CheckmarkCircleIcon,
  AlertTriangleIcon,
  PhoneIcon,
  CalendarIcon,
  CancelCircleIcon,
} from "@/components/icons/Hugeicons";

interface AppointmentDetail {
  id: string;
  bookingReference: string;
  cancellationToken: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  priceEtb: number;
  startTime: string;
  endTime: string;
  status: "BOOKED" | "CANCELLED" | "COMPLETED";
  notes?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
}

interface CutoffInfo {
  canModify: boolean;
  hoursRemaining: number;
  cutoffHours: number;
  isPast: boolean;
}

export default function ManageAppointmentPage() {
  const params = useParams();
  const token = params?.token as string;

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [cutoff, setCutoff] = useState<CutoffInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal / action states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  // Fetch appointment on mount
  useEffect(() => {
    async function fetchAppointment() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await fetch(`/api/manage/${token}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Appointment not found");
        }

        setAppointment(data.appointment);
        setCutoff(data.cutoff);

        // Default reschedule date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setRescheduleDate(getAddisDateString(tomorrow));
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load appointment details");
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchAppointment();
  }, [token]);

  // Fetch slots when reschedule date changes
  useEffect(() => {
    if (!showReschedule || !appointment || !rescheduleDate) return;

    async function loadRescheduleSlots() {
      try {
        setLoadingSlots(true);
        setSelectedSlot(null);
        const url = `/api/availability?serviceId=${encodeURIComponent(
          appointment!.serviceId
        )}&date=${encodeURIComponent(rescheduleDate)}&barberId=${encodeURIComponent(
          appointment!.barberId
        )}`;

        const res = await fetch(url);
        const data = await res.json();
        setAvailableSlots(data.slots || []);
      } catch (err: any) {
        console.error("Reschedule slots error", err);
      } finally {
        setLoadingSlots(false);
      }
    }

    loadRescheduleSlots();
  }, [showReschedule, rescheduleDate, appointment]);

  // Handle Cancel
  const handleConfirmCancel = async () => {
    try {
      setCancelling(true);
      setErrorMsg(null);

      const res = await fetch(`/api/manage/${token}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel appointment");
      }

      setAppointment(data.appointment);
      setShowCancelModal(false);
      setSuccessMsg("Your appointment has been successfully cancelled.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  };

  // Handle Reschedule
  const handleConfirmReschedule = async () => {
    if (!selectedSlot) return;

    try {
      setRescheduling(true);
      setErrorMsg(null);

      const res = await fetch(`/api/manage/${token}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: rescheduleDate,
          time: selectedSlot.timeStr,
          barberId: appointment?.barberId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reschedule appointment");
      }

      setAppointment(data.appointment);
      setShowReschedule(false);
      setSuccessMsg("Your appointment has been successfully rescheduled!");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reschedule");
    } finally {
      setRescheduling(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center py-40">
        <div className="card-light p-30 text-center font-heading text-xl text-[#666666]">
          Loading appointment details...
        </div>
      </main>
    );
  }

  if (errorMsg && !appointment) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-20 py-40">
        <div className="card-light max-w-md w-full text-center flex flex-col gap-20 p-30 border-2 border-[#141414]">
          <h2 className="font-heading text-3xl text-red-600">Appointment Not Found</h2>
          <p className="text-xs text-[#666666] font-medium">
            We could not find a booking matching this secure link. It may have expired or was typed incorrectly.
          </p>
          <Link
            href="/"
            className="btn-primary text-xs uppercase tracking-wider font-extrabold"
            style={{ minHeight: 44 }}
          >
            Return to Home
          </Link>
        </div>
      </main>
    );
  }

  if (!appointment) return null;

  const dual = formatDualDate(appointment.startTime);
  const timeStr = new Date(appointment.startTime).toLocaleTimeString("en-ET", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Addis_Ababa",
  });

  return (
    <main className="flex-1 flex flex-col gap-25 max-w-xl mx-auto w-full pb-40">
      {/* Header Banner */}
      <div className="card-light p-20 flex items-center justify-between border-2 border-[#141414]">
        <div>
          <span className="badge-purple text-[10px] py-0.5 px-8 mb-2">
            Self-Service Portal
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl text-[#000000]">
            Manage Appointment
          </h1>
        </div>
        <Link
          href="/"
          className="btn-secondary text-xs uppercase tracking-wider font-bold px-15 py-6"
          style={{ minHeight: 38 }}
        >
          ← Shop Home
        </Link>
      </div>

      {/* Success alert */}
      {successMsg && (
        <div className="p-15 bg-green-100 border-2 border-green-600 text-green-900 rounded-btn text-xs text-center font-bold flex items-center justify-center gap-1.5">
          <CheckmarkCircleIcon size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error alert */}
      {errorMsg && (
        <div className="p-15 bg-red-100 border-2 border-red-600 text-red-900 rounded-btn text-xs text-center font-bold">
          {errorMsg}
        </div>
      )}

      {/* Appointment Summary Ticket */}
      <div className="card-light flex flex-col gap-20 p-28 border-2 border-[#141414] shadow-[4px_5px_0px_#141414]">
        <div className="flex justify-between items-center pb-15 border-b-2 border-[#141414]">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#666666] tracking-wider block">
              Booking Reference
            </span>
            <div className="font-heading text-2xl text-[#6040ff]">
              {appointment.bookingReference}
            </div>
          </div>

          <div>
            {appointment.status === "BOOKED" && (
              <span className="badge-accent">
                Confirmed
              </span>
            )}
            {appointment.status === "CANCELLED" && (
              <span className="bg-red-600 text-white font-heading text-sm px-12 py-2 rounded-pill">
                Cancelled
              </span>
            )}
            {appointment.status === "COMPLETED" && (
              <span className="bg-green-600 text-white font-heading text-sm px-12 py-2 rounded-pill">
                Completed
              </span>
            )}
          </div>
        </div>

        {/* Details list */}
        <div className="flex flex-col gap-10 text-xs sm:text-sm">
          <div className="flex justify-between py-8 border-b border-[#141414]/15">
            <span className="text-[#666666] font-medium">Service</span>
            <span className="font-bold text-[#000000]">{appointment.serviceName}</span>
          </div>

          <div className="flex justify-between py-8 border-b border-[#141414]/15">
            <span className="text-[#666666] font-medium">Duration</span>
            <span className="font-mono font-bold text-[#000000]">{appointment.durationMinutes} minutes</span>
          </div>

          <div className="flex justify-between py-8 border-b border-[#141414]/15">
            <span className="text-[#666666] font-medium">Barber</span>
            <span className="font-bold text-[#000000]">{appointment.barberName}</span>
          </div>

          <div className="flex justify-between py-8 border-b border-[#141414]/15">
            <span className="text-[#666666] font-medium">Scheduled Time</span>
            <div className="text-right">
              <span className="font-bold text-[#000000] block">
                {dual.gregorianFormatted} at {timeStr}
              </span>
              <span className="text-xs text-[#ff8442] font-semibold">
                {dual.ethiopianFormatted}
              </span>
            </div>
          </div>

          <div className="flex justify-between py-8 border-b border-[#141414]/15">
            <span className="text-[#666666] font-medium">Client</span>
            <span className="font-bold text-[#000000]">{appointment.customerName}</span>
          </div>

          <div className="flex justify-between py-8 border-b border-[#141414]/15">
            <span className="text-[#666666] font-medium">Phone</span>
            <span className="font-mono font-bold text-[#000000]">{appointment.customerPhone}</span>
          </div>

          <div className="flex justify-between items-center pt-10">
            <span className="font-bold text-[#000000] text-sm">Total Due At Shop:</span>
            <span className="font-heading text-3xl text-[#ff8442]">
              {formatETB(appointment.priceEtb)}
            </span>
          </div>
        </div>

        {/* CANCELLED state banner */}
        {appointment.status === "CANCELLED" && (
          <div className="bg-[#faf5ea] p-15 rounded-card flex flex-col gap-8 border-2 border-red-600 text-xs">
            <span className="font-heading text-lg text-red-600 uppercase">
              Appointment Has Been Cancelled
            </span>
            <p className="text-[#666666] font-medium">
              Reason: {appointment.cancellationReason || "Cancelled by customer"}
            </p>
            <Link
              href="/#book"
              className="btn-primary text-center text-xs uppercase tracking-wider font-extrabold mt-5"
              style={{ minHeight: 40 }}
            >
              Book a New Appointment
            </Link>
          </div>
        )}

        {/* 2-HOUR CUTOFF EXPIRED BANNER */}
        {appointment.status === "BOOKED" && cutoff && !cutoff.canModify && (
          <div className="bg-[#faf5ea] p-15 rounded-card flex flex-col gap-8 border-2 border-[#ff8442] text-xs">
            <div className="font-heading text-lg text-[#000000] flex items-center gap-2">
              <AlertTriangleIcon size={20} className="text-[#ff8442]" />
              <span>Online Modification Locked (Within 2 Hours)</span>
            </div>
            <p className="text-[#666666] font-medium leading-relaxed">
              Online rescheduling and cancellation must be made at least <strong>2 hours</strong> in advance. For last-minute changes, please call our Ayat 49 shop directly.
            </p>
            <a
              href="tel:+251911223344"
              className="btn-primary text-center font-extrabold text-xs mt-5 shadow-sm uppercase tracking-wider inline-flex items-center justify-center gap-1.5"
              style={{ minHeight: 40 }}
            >
              <PhoneIcon size={14} />
              <span>Call Shop: +251 911 223 344</span>
            </a>
          </div>
        )}

        {/* ACTIONS: Reschedule & Cancel Buttons */}
        {appointment.status === "BOOKED" && cutoff?.canModify && (
          <div className="flex flex-col sm:flex-row gap-10 pt-10 border-t-2 border-[#141414]/15">
            <button
              onClick={() => {
                setShowReschedule(!showReschedule);
                setShowCancelModal(false);
              }}
              className="btn-primary flex-1 text-xs uppercase tracking-wider font-extrabold inline-flex items-center justify-center gap-1.5"
              style={{ minHeight: 44 }}
            >
              <CalendarIcon size={16} />
              <span>{showReschedule ? "Close Reschedule" : "Reschedule Slot"}</span>
            </button>
            <button
              onClick={() => {
                setShowCancelModal(true);
                setShowReschedule(false);
              }}
              className="btn-secondary flex-1 text-xs uppercase tracking-wider font-bold text-red-600 hover:bg-red-50 inline-flex items-center justify-center gap-1.5"
              style={{ minHeight: 44 }}
            >
              <CancelCircleIcon size={16} />
              <span>Cancel Appointment</span>
            </button>
          </div>
        )}
      </div>

      {/* RESCHEDULE DRAWER */}
      {showReschedule && (
        <div className="card-light p-28 flex flex-col gap-15 border-2 border-[#141414] animate-in fade-in duration-150">
          <h3 className="font-heading text-2xl text-[#000000] border-b-2 border-[#141414] pb-10">
            Pick a New Date &amp; Time
          </h3>

          <div className="flex flex-col gap-5">
            <label className="font-heading text-base text-[#000000]">Select New Date:</label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="input-standard"
            />
          </div>

          <div className="flex flex-col gap-10">
            <label className="font-heading text-base text-[#000000]">
              Available Slots with {appointment.barberName}:
            </label>

            {loadingSlots ? (
              <div className="py-20 text-center font-heading text-lg text-[#666666]">
                Checking availability...
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="p-15 rounded-card bg-[#faf5ea] border-2 border-[#141414] text-xs text-[#666666] font-medium text-center">
                No slots available on this date. Please pick another day.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-10">
                {availableSlots.map((slot) => {
                  const isSel = selectedSlot?.timeStr === slot.timeStr;
                  return (
                    <button
                      key={slot.timeStr}
                      onClick={() => setSelectedSlot(slot)}
                      className={`btn-pill text-xs font-mono font-bold ${
                        isSel
                          ? "bg-[#ff8442] text-black shadow-[2px_3px_0px_#141414]"
                          : "bg-[#ffffff] text-black hover:bg-[#faf5ea]"
                      }`}
                      style={{ minHeight: 40 }}
                    >
                      {slot.displayTime}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedSlot && (
            <button
              onClick={handleConfirmReschedule}
              disabled={rescheduling}
              className="btn-primary font-heading text-lg w-full mt-10"
              style={{ minHeight: 48 }}
            >
              {rescheduling ? "Updating..." : `Confirm Reschedule to ${rescheduleDate} at ${selectedSlot.displayTime}`}
            </button>
          )}
        </div>
      )}

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="card-light p-28 flex flex-col gap-15 border-2 border-red-600 shadow-[4px_5px_0px_#dc2626] animate-in fade-in duration-150">
          <h3 className="font-heading text-2xl text-red-600">
            Confirm Appointment Cancellation
          </h3>
          <p className="text-xs text-[#666666] font-medium leading-relaxed">
            Are you sure you want to cancel your appointment ({appointment.bookingReference}) on {dual.gregorianFormatted} at {timeStr}?
          </p>

          <div className="flex flex-col gap-5">
            <label className="font-heading text-sm text-[#000000]">Reason for cancellation (optional):</label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Schedule conflict, feeling unwell"
              className="input-standard"
            />
          </div>

          <div className="flex gap-10 pt-5">
            <button
              onClick={handleConfirmCancel}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700 text-white font-heading text-base px-20 py-10 rounded-pill flex-1 border-2 border-[#141414]"
              style={{ minHeight: 44 }}
            >
              {cancelling ? "Cancelling..." : "Yes, Cancel Reservation"}
            </button>
            <button
              onClick={() => setShowCancelModal(false)}
              className="btn-secondary flex-1 text-xs uppercase tracking-wider font-bold"
              style={{ minHeight: 44 }}
            >
              Keep My Booking
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
