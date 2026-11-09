"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatETB, formatDualDate, toEthiopianDate } from "@/lib/ethiopian-calendar";
import { validateEthiopianPhone, formatEthiopianPhone } from "@/lib/phone";
import { getAddisDateString } from "@/lib/date-utils";
import { ClockIcon, CheckmarkIcon, CloseIcon, CopyIcon } from "@/components/icons/Hugeicons";

const TELEBIRR_NUMBER = process.env.NEXT_PUBLIC_TELEBIRR_NUMBER || "+251 96 771 0870";
const TELEBIRR_NAME = process.env.NEXT_PUBLIC_TELEBIRR_NAME || "FIRAOL BAYISA";
const CBE_ACCOUNT = process.env.NEXT_PUBLIC_CBE_ACCOUNT || "1000 4589 2310 9874";
const CBE_NAME = process.env.NEXT_PUBLIC_CBE_NAME || "FIRAOL BAYISA";

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceEtb: number;
}

interface Slot {
  timeStr: string;
  displayTime: string;
  barberId: string;
}

interface BookingFlowProps {
  preselectedServiceId?: string | null;
}

// Client-side image compressor: scales down screenshots to max 1200px at 0.8 quality
function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve("");
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve((e.target?.result as string) || "");
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve((e.target?.result as string) || "");
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = (e.target?.result as string) || "";
    };
    reader.readAsDataURL(file);
  });
}

export default function BookingFlow({ preselectedServiceId }: BookingFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Data states
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selection states
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Customer Form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("+251");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentScreenshotPreview, setPaymentScreenshotPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [shimmerCard, setShimmerCard] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setShimmerCard(key);
      setTimeout(() => setCopiedKey(null), 2000);
      setTimeout(() => setShimmerCard(null), 850);
    }
  };

  // 1. Fetch Services on mount
  useEffect(() => {
    async function initData() {
      try {
        setLoadingServices(true);
        const srvRes = await fetch("/api/services");
        const srvData = await srvRes.json();

        setServices(srvData.services || []);

        // If preselected service is provided, select it and skip to step 2
        if (preselectedServiceId) {
          const preselectedService = srvData.services?.find((s: Service) => s.id === preselectedServiceId);
          if (preselectedService) {
            setSelectedService(preselectedService);
            setStep(2);
          }
        }

        // Default date to tomorrow in Addis
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setSelectedDate(getAddisDateString(tomorrow));
      } catch (err) {
        console.error("Failed to load initial booking data", err);
        setErrorMsg("Failed to load services. Please refresh the page.");
      } finally {
        setLoadingServices(false);
      }
    }
    initData();
  }, [preselectedServiceId]);

  // 2. Fetch Slots whenever Service or Date changes
  useEffect(() => {
    if (!selectedService || !selectedDate) return;

    async function fetchSlots() {
      try {
        setLoadingSlots(true);
        setErrorMsg(null);
        setSelectedSlot(null);

        const url = `/api/availability?serviceId=${encodeURIComponent(
          selectedService!.id
        )}&date=${encodeURIComponent(selectedDate)}&barberId=any`;

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch slots");
        }

        setSlots(data.slots || []);
      } catch (err: any) {
        console.error("Availability fetch error:", err);
        setErrorMsg(err.message || "Failed to retrieve open slots");
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [selectedService, selectedDate]);

  // Generate 14 upcoming dates in Addis local time
  const upcomingDates = React.useMemo(() => {
    const dates = [];
    const base = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      const dateStr = getAddisDateString(d);
      const ethDate = toEthiopianDate(d);
      dates.push({
        dateStr,
        dayOfWeek: d.toLocaleDateString("en-ET", {
          weekday: "short",
          timeZone: "Africa/Addis_Ababa",
        }),
        dayNum: d.toLocaleDateString("en-ET", {
          day: "numeric",
          timeZone: "Africa/Addis_Ababa",
        }),
        month: d.toLocaleDateString("en-ET", {
          month: "short",
          timeZone: "Africa/Addis_Ababa",
        }),
        ethiopianDay: ethDate.day,
        ethiopianMonth: ethDate.monthName,
        isToday: i === 0,
        isTomorrow: i === 1,
      });
    }
    return dates;
  }, []);

  // Phone input validator
  const handlePhoneChange = (val: string) => {
    setCustomerPhone(val);
    if (val.trim().length >= 9) {
      const v = validateEthiopianPhone(val);
      if (!v.isValid) {
        setPhoneError(v.error || "Invalid Ethiopian phone (+251 9XX or +251 7XX)");
      } else {
        setPhoneError(null);
      }
    } else {
      setPhoneError(null);
    }
  };

  // Submit Booking
  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedSlot || !selectedDate || !paymentScreenshot) return;

    const phoneCheck = validateEthiopianPhone(customerPhone);
    if (!phoneCheck.isValid) {
      setPhoneError(phoneCheck.error || "Please enter a valid Ethiopian phone number");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setUploading(true);

      // Upload payment screenshot with fallback to compressed base64 data URL
      let screenshotUrl = paymentScreenshotPreview;
      try {
        const formData = new FormData();
        formData.append("file", paymentScreenshot);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.url) {
            screenshotUrl = uploadData.url;
          }
        }
      } catch (uploadErr) {
        console.warn("Upload fallback to data URL:", uploadErr);
      }

      // Use the first available barber (since there's only 1 barber)
      const barberId = selectedSlot.barberId || "any";

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          barberId: barberId,
          date: selectedDate,
          time: selectedSlot.timeStr,
          customerName,
          customerPhone: phoneCheck.normalized,
          paymentScreenshot: screenshotUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to book appointment");
      }

      setBookingSuccess(true);
    } catch (err: any) {
      console.error("Booking error:", err);
      setErrorMsg(err.message || "An error occurred while booking. Please try again.");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  // ================= SUCCESS VIEW =================
  if (bookingSuccess) {
    return (
      <div className="card-light max-w-xl mx-auto my-8 p-6 sm:p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-lg bg-[#5b4cff] text-white flex items-center justify-center mb-4">
          <CheckmarkIcon size={32} strokeWidth={2.5} />
        </div>
        <span className="badge-purple mb-3">Booking Confirmed</span>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#0f0f14] leading-tight">
          See You In The Chair!
        </h2>
        <p className="text-sm text-[#666666] mt-3">
          Your appointment has been secured at Buraclipz, Ayat 49.
        </p>
        <button
          onClick={() => {
            setBookingSuccess(false);
            setStep(1);
            setSelectedSlot(null);
            setSelectedService(null);
          }}
          className="btn-secondary w-full mt-6"
        >
          Book Another Appointment
        </button>
      </div>
    );
  }

  // ================= STEP FLOW CONTAINER =================
  return (
    <div className="card-light p-4 sm:p-6 flex flex-col gap-6">
      {/* Interactive Step Header & Navigation */}
      <div className="flex flex-col gap-3 pb-4 border-b border-[#e5e5e5]">
        {/* Top Control Bar: Back Button on left, Step indicators on right */}
        <div className="flex items-center justify-between gap-3">
          {step === 1 ? (
            <Link
              href="/"
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0"
              aria-label="Back to home"
            >
              ← Back
            </Link>
          ) : (
            <button
              onClick={() => setStep((s) => (s - 1) as any)}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0"
              aria-label="Back to previous step"
            >
              ← Back
            </button>
          )}

          {/* Stepper Pills on the right */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {[1, 2, 3].map((num) => {
              const isActive = step === num;
              const isDone = step > num;
              return (
                <button
                  key={num}
                  onClick={() => {
                    if (num < step) setStep(num as any);
                  }}
                  disabled={num > step}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center border transition-all ${
                    isActive
                      ? "bg-[#5b4cff] text-white border-[#5b4cff] shadow-sm"
                      : isDone
                      ? "bg-[#5b4cff]/90 text-white border-[#5b4cff]"
                      : "bg-white text-[#888888] border-[#e5e5e5] cursor-not-allowed opacity-60"
                  }`}
                  aria-label={`Go to step ${num}`}
                >
                  {isDone ? <CheckmarkIcon size={14} strokeWidth={2.5} /> : num}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Progress Line */}
        <div className="w-full bg-[#f0f0f3] h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#5b4cff] h-full transition-all duration-300 rounded-full"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Step Title & Subtitle: Full width, clean typography */}
        <div className="flex flex-col gap-1 pt-1">
          <span className="badge-accent text-[11px] font-bold uppercase tracking-wider w-fit">
            Step {step} of 3
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0f0f14] leading-tight">
            {step === 1 && "Choose Your Grooming Service"}
            {step === 2 && "Pick Date & Time"}
            {step === 3 && "Enter Your Details"}
          </h2>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="error-bar">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="p-1 hover:opacity-80 transition-opacity"
            aria-label="Dismiss error"
          >
            <CloseIcon size={16} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* ================= STEP 1: SERVICE SELECTION ================= */}
      {step === 1 && (
        <div className="flex flex-col gap-6">
          {loadingServices ? (
            <div className="py-16 text-center text-[#666666]">
              Loading services...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => {
                const isSelected = selectedService?.id === service.id;
                return (
                  <div
                    key={service.id}
                    onClick={() => {
                      setSelectedService(service);
                      setStep(2);
                    }}
                    className={`card-light cursor-pointer transition-all flex flex-col justify-between gap-3 p-4 ${
                      isSelected
                        ? "border-[#5b4cff] shadow-md"
                        : "hover:shadow-md"
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="text-base font-semibold text-[#0f0f14] leading-tight">
                          {service.name}
                        </h3>
                        <span className="text-base font-semibold text-[#5b4cff] shrink-0">
                          {formatETB(service.priceEtb)}
                        </span>
                      </div>
                      <p className="text-sm text-[#666666] leading-relaxed">
                        {service.description || "Master grooming tailored to your style."}
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-[#e5e5e5] text-sm">
                      <span className="font-medium text-[#666666] flex items-center gap-1.5">
                        <ClockIcon size={14} strokeWidth={1.8} />
                        <span>{service.durationMinutes} min</span>
                      </span>
                      <span className="font-medium text-[#5b4cff]">
                        Select →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= STEP 2: DATE & TIME ================= */}
      {step === 2 && (
        <div className="flex flex-col gap-6">
          {/* Active Summary Banner */}
          <div className="p-4 rounded-lg bg-[#f5f5f8] border border-[#e5e5e5] flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-semibold text-[#666666] block">Service</span>
              <span className="text-base font-semibold text-[#0f0f14]">{selectedService?.name}</span>
            </div>
            <button
              onClick={() => setStep(1)}
              className="btn-secondary text-xs"
            >
              Change Service
            </button>
          </div>

          {/* Date Picker Ribbon */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-base font-semibold text-[#0f0f14]">
                1. Pick A Date
              </label>
              <span className="badge-accent text-xs">
                {selectedDate ? formatDualDate(selectedDate).combined : ""}
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {upcomingDates.map((item) => {
                const isSelected = selectedDate === item.dateStr;
                return (
                  <button
                    key={item.dateStr}
                    onClick={() => setSelectedDate(item.dateStr)}
                    className={`date-pill ${
                      isSelected ? "date-pill-active" : "date-pill-default"
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wider font-semibold text-[#666666]">
                      {item.dayOfWeek}
                    </span>
                    <span className="text-lg font-semibold my-1">
                      {item.dayNum}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#e5e5e5] text-[#666666]">
                      {item.ethiopianMonth.slice(0, 3)} {item.ethiopianDay}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slots Grid */}
          <div className="flex flex-col gap-4 pt-4 border-t border-[#e5e5e5]">
            <div className="flex items-center justify-between">
              <label className="text-base font-semibold text-[#0f0f14]">
                2. Select Time Slot
              </label>
              <span className="text-xs font-medium text-[#666666]">Addis Time (UTC+3)</span>
            </div>

            {loadingSlots ? (
              <div className="py-12 text-center text-[#666666]">
                Checking availability...
              </div>
            ) : slots.length === 0 ? (
              <div className="p-4 text-center rounded-lg bg-white border border-[#e5e5e5]">
                <p className="text-base font-semibold text-[#0f0f14]">No available slots for this date.</p>
                <p className="text-sm text-[#666666] mt-2">
                  Fully booked or closed. Please pick another date above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.timeStr === slot.timeStr;
                  return (
                    <button
                      key={slot.timeStr}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setStep(3);
                      }}
                      className={`time-slot ${
                        isSelected ? "time-slot-active" : "time-slot-default"
                      }`}
                    >
                      {slot.displayTime}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= STEP 3: CUSTOMER DETAILS & CONFIRM ================= */}
      {step === 3 && (
        <div className="flex flex-col gap-6 max-w-xl mx-auto w-full">
          {/* Reservation recap chip */}
          <div className="p-4 rounded-lg bg-[#f5f5f8] border border-[#e5e5e5] text-sm flex justify-between items-center">
            <div>
              <span className="text-base font-semibold text-[#0f0f14] block">{selectedService?.name}</span>
              <span className="text-[#666666]">
                {selectedDate} at {selectedSlot?.displayTime} • {formatETB(selectedService?.priceEtb || 0)}
              </span>
            </div>
            <button
              onClick={() => setStep(2)}
              className="text-[#5b4cff] font-medium hover:underline"
            >
              Change Slot
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = validateEthiopianPhone(customerPhone);
              if (!v.isValid) {
                setPhoneError(v.error || "Please enter a valid Ethiopian phone number");
                return;
              }
              handleConfirmBooking();
            }}
            className="flex flex-col gap-4"
          >
            {/* Full Name */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[#0f0f14]">
                Full Name <span className="text-[#5b4cff]">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Dawit Haile"
                className="input-standard"
              />
            </div>

            {/* Ethiopian Phone Number */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[#0f0f14]">
                Ethiopian Phone Number (+251) <span className="text-[#5b4cff]">*</span>
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+251 9XX XXX XXX"
                className="input-standard font-mono"
              />
              {phoneError && (
                <span className="text-xs text-red-600 font-semibold">
                  {phoneError}
                </span>
              )}
            </div>

            {/* Payment Method & Accounts Details */}
            <div className="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-[#e5e5e5] shadow-xs">
              <div className="flex items-center justify-between border-b border-[#f0f0f3] pb-3.5">
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#0f0f14]">
                    Transfer Service Amount
                  </h3>
                  <p className="text-xs text-[#666666] mt-0.5">
                    Please transfer exactly <strong className="text-[#0f0f14]">{selectedService ? formatETB(selectedService.priceEtb) : ""}</strong> to either account below:
                  </p>
                </div>
                {selectedService && (
                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-[#777777] block font-medium">Total Due:</span>
                    <span className="font-heading text-lg sm:text-xl font-bold text-[#5b4cff]">
                      {formatETB(selectedService.priceEtb)}
                    </span>
                  </div>
                )}
              </div>

              {/* Accounts Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Telebirr Card */}
                <div className="p-3.5 rounded-xl bg-[#fafafc] border border-[#e5e5e5] hover:border-[#d5d5df] transition-colors flex flex-col justify-between gap-3">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCopy(TELEBIRR_NUMBER, "telebirr")}
                    onKeyDown={(e) => e.key === "Enter" && handleCopy(TELEBIRR_NUMBER, "telebirr")}
                    className={`holo-card group relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-[#e5e5e5] shadow-sm bg-[#0b382c] ${
                      shimmerCard === "telebirr" ? "is-shimmering ring-2 ring-[#00a651]" : ""
                    }`}
                    aria-label="Tap card to copy Telebirr Number"
                  >
                    <img
                      src="/images/telebirr-card.jpg"
                      alt="Telebirr Digital Wallet Card"
                      className="w-full h-full object-cover scale-[1.20] transition-transform duration-300 group-hover:scale-[1.24]"
                    />
                    <div className="absolute top-2 right-2 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CopyIcon size={11} /> Tap to Copy
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00a651] shrink-0" />
                    <span className="font-bold text-xs text-[#0f0f14] tracking-wide">
                      Telebirr Wallet
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-[#777777] block">Phone / Account:</span>
                    <span className="font-mono text-sm sm:text-base font-bold text-[#0f0f14] tracking-wider block">
                      {TELEBIRR_NUMBER}
                    </span>
                    <span className="text-[11px] text-[#555555] block mt-0.5">
                      Name: <strong className="text-[#0f0f14]">{TELEBIRR_NAME}</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(TELEBIRR_NUMBER, "telebirr")}
                    className="w-full text-xs font-semibold py-2 px-2.5 rounded-lg bg-white border border-[#e0e0e5] hover:bg-[#f5f5f8] transition-colors flex items-center justify-center gap-1.5 text-[#0f0f14] shadow-2xs"
                  >
                    {copiedKey === "telebirr" ? (
                      <>
                        <CheckmarkIcon size={14} className="text-green-600" />
                        <span className="text-green-600 font-bold">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon size={14} className="text-[#666666]" />
                        <span>Copy Telebirr Number</span>
                      </>
                    )}
                  </button>
                </div>

                {/* CBE Account Card */}
                <div className="p-3.5 rounded-xl bg-[#fafafc] border border-[#e5e5e5] hover:border-[#d5d5df] transition-colors flex flex-col justify-between gap-3">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCopy(CBE_ACCOUNT.replace(/\s+/g, ""), "cbe")}
                    onKeyDown={(e) => e.key === "Enter" && handleCopy(CBE_ACCOUNT.replace(/\s+/g, ""), "cbe")}
                    className={`holo-card group relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-[#e5e5e5] shadow-sm bg-[#161618] ${
                      shimmerCard === "cbe" ? "is-shimmering ring-2 ring-[#5b4cff]" : ""
                    }`}
                    aria-label="Tap card to copy CBE Account"
                  >
                    <img
                      src="/images/cbe-card.jpg"
                      alt="Commercial Bank of Ethiopia Debit Card"
                      className="w-full h-full object-cover scale-[1.20] transition-transform duration-300 group-hover:scale-[1.24]"
                    />
                    <div className="absolute top-2 right-2 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CopyIcon size={11} /> Tap to Copy
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8c1d40] shrink-0" />
                    <span className="font-bold text-xs text-[#0f0f14] tracking-wide">
                      Commercial Bank of Ethiopia
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-[#777777] block">Account Number:</span>
                    <span className="font-mono text-sm sm:text-base font-bold text-[#0f0f14] tracking-wider block">
                      {CBE_ACCOUNT}
                    </span>
                    <span className="text-[11px] text-[#555555] block mt-0.5">
                      Name: <strong className="text-[#0f0f14]">{CBE_NAME}</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(CBE_ACCOUNT.replace(/\s+/g, ""), "cbe")}
                    className="w-full text-xs font-semibold py-2 px-2.5 rounded-lg bg-white border border-[#e0e0e5] hover:bg-[#f5f5f8] transition-colors flex items-center justify-center gap-1.5 text-[#0f0f14] shadow-2xs"
                  >
                    {copiedKey === "cbe" ? (
                      <>
                        <CheckmarkIcon size={14} className="text-green-600" />
                        <span className="text-green-600 font-bold">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon size={14} className="text-[#666666]" />
                        <span>Copy CBE Account</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Steps hint */}
              <div className="text-[11px] text-[#666666] flex flex-col gap-1 pt-1 border-t border-[#f0f0f3]">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#f0f0f3] text-[#555555] font-semibold text-[10px] flex items-center justify-center shrink-0">1</span>
                  <span>Open your Telebirr app or CBE Mobile Banking.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#f0f0f3] text-[#555555] font-semibold text-[10px] flex items-center justify-center shrink-0">2</span>
                  <span>Send the exact amount ({selectedService ? formatETB(selectedService.priceEtb) : ""}) to either account above.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#f0f0f3] text-[#555555] font-semibold text-[10px] flex items-center justify-center shrink-0">3</span>
                  <span>Take a screenshot of the transaction confirmation and upload it below.</span>
                </div>
              </div>
            </div>

            {/* Payment Screenshot Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[#0f0f14]">
                Payment Screenshot <span className="text-[#5b4cff]">*</span>
              </label>
              <div className="p-4 rounded-lg bg-[#f5f5f8] border border-[#e5e5e5]">
                <p className="text-sm text-[#666666] mb-3">
                  Please upload payment screenshot (Telebirr or CBE Birr).
                </p>
                <div className="flex flex-col gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPaymentScreenshot(file);
                        try {
                          const compressed = await compressImage(file);
                          setPaymentScreenshotPreview(compressed || "");
                        } catch {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setPaymentScreenshotPreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#5b4cff] file:text-white hover:file:bg-[#4a3fe6] cursor-pointer"
                  />
                  {paymentScreenshotPreview && (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden border border-[#e5e5e5]">
                      <img
                        src={paymentScreenshotPreview}
                        alt="Payment screenshot preview"
                        className="w-full h-full object-contain bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentScreenshot(null);
                          setPaymentScreenshotPreview("");
                        }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center transition-opacity hover:opacity-90 shadow-sm"
                        aria-label="Remove screenshot"
                      >
                        <CloseIcon size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full mt-4"
              disabled={!paymentScreenshot || uploading}
            >
              {uploading ? "Uploading..." : submitting ? "Booking..." : "Book Appointment →"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
