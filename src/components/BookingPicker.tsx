"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getAddisDateString } from "@/lib/date-utils";
import { toEthiopianDate } from "@/lib/ethiopian-calendar";
import {
  ClockIcon,
  GlobeIcon,
  BlockIcon,
} from "@/components/icons/Hugeicons";

export interface SlotItem {
  timeStr: string; // "09:00"
  displayTime: string; // "09:00 AM"
  barberId: string;
  isAvailable?: boolean;
  unavailableReason?: string;
}

interface BookingPickerProps {
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (dateStr: string) => void;
  selectedSlot: SlotItem | null;
  onSelectSlot: (slot: SlotItem) => void;
  availableSlots: SlotItem[];
  loadingSlots: boolean;
  serviceDurationMinutes?: number;
  onConfirm?: () => void;
}

// Operating hours strictly up to 5:00 PM
const AM_SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
const PM_SLOTS = [
  "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00"
];

function format12h(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, "0")} ${suffix}`;
}

function calculateEndTime(timeStr: string, durationMinutes = 30): string {
  const [hStr, mStr] = timeStr.split(":");
  let totalMin = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + durationMinutes;
  const endH = Math.floor(totalMin / 60);
  const endM = totalMin % 60;
  const suffix = endH >= 12 ? "PM" : "AM";
  const displayH = endH % 12 || 12;
  return `${displayH}:${endM.toString().padStart(2, "0")} ${suffix}`;
}

export default function BookingPicker({
  selectedDate,
  onSelectDate,
  selectedSlot,
  onSelectSlot,
  availableSlots,
  loadingSlots,
  serviceDurationMinutes = 30,
  onConfirm,
}: BookingPickerProps) {
  // Week navigation offset (0 = current 7-day strip, 1 = next week, etc.)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // AM / PM Segmented Switcher (replaces slots in place without expanding layout)
  const [activePeriod, setActivePeriod] = useState<"AM" | "PM">(() => {
    if (selectedSlot) {
      const h = parseInt(selectedSlot.timeStr.split(":")[0], 10);
      return h >= 12 ? "PM" : "AM";
    }
    return "AM";
  });

  // Automatically sync period if a slot was already chosen
  useEffect(() => {
    if (selectedSlot) {
      const h = parseInt(selectedSlot.timeStr.split(":")[0], 10);
      setActivePeriod(h >= 12 ? "PM" : "AM");
    }
  }, [selectedSlot]);

  // Strictly One-Week Date Range (7 Days) with pagination
  const weekDays = useMemo(() => {
    const days = [];
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);

    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dateStr = getAddisDateString(d);

      days.push({
        dateStr,
        dateObj: d,
        weekday: d.toLocaleDateString("en-US", {
          weekday: "short",
          timeZone: "Africa/Addis_Ababa",
        }).toUpperCase(),
        dayNum: d.toLocaleDateString("en-US", {
          day: "numeric",
          timeZone: "Africa/Addis_Ababa",
        }),
        monthShort: d.toLocaleDateString("en-US", {
          month: "short",
          timeZone: "Africa/Addis_Ababa",
        }),
      });
    }
    return days;
  }, [weekOffset]);

  // One-week range label matching reference mockup: e.g. "Nov 17 to Nov 23"
  const weekRangeLabel = useMemo(() => {
    if (weekDays.length === 0) return "";
    const first = weekDays[0];
    const last = weekDays[6];
    return `${first.monthShort} ${first.dayNum} to ${last.monthShort} ${last.dayNum}`;
  }, [weekDays]);

  const handlePrevWeek = () => {
    if (weekOffset > 0) {
      setWeekOffset((prev) => prev - 1);
    }
  };

  const handleNextWeek = () => {
    setWeekOffset((prev) => prev + 1);
  };

  // Timezone & Offset calculation
  const [timeZoneString, setTimeZoneString] = useState<string>("Africa/Addis_Ababa (UTC+3)");
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offsetMin = -new Date().getTimezoneOffset();
      const sign = offsetMin >= 0 ? "+" : "-";
      const h = Math.floor(Math.abs(offsetMin) / 60);
      setTimeZoneString(`${tz} (UTC${sign}${h})`);
    } catch {
      setTimeZoneString("Africa/Addis_Ababa (UTC+3)");
    }
  }, []);

  // Live "Starts-In" Countdown
  const [countdownString, setCountdownString] = useState<string>("Starts in 12 h 16 min");

  useEffect(() => {
    if (!selectedSlot || !selectedDate) {
      return;
    }

    function updateCountdown() {
      const [h, m] = selectedSlot!.timeStr.split(":").map(Number);
      const [year, month, day] = selectedDate.split("-").map(Number);

      const targetDate = new Date(year, month - 1, day, h, m, 0);
      const now = new Date();
      const diffMs = targetDate.getTime() - now.getTime();

      if (diffMs <= 0) {
        setCountdownString("Starting now / in progress");
        return;
      }

      const totalSec = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);

      if (days > 0) {
        setCountdownString(`Starts in ${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setCountdownString(`Starts in ${hours} h ${minutes} min`);
      } else {
        setCountdownString(`Starts in ${minutes} min`);
      }
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [selectedSlot, selectedDate]);

  // Compute Active Period Slots (AM vs PM, strictly up to 5:00 PM)
  const currentSlotTimes = activePeriod === "AM" ? AM_SLOTS : PM_SLOTS;

  const currentSlots = useMemo(() => {
    const availableMap = new Map<string, SlotItem>();
    for (const s of availableSlots) {
      availableMap.set(s.timeStr, s);
    }

    return currentSlotTimes.map((timeStr) => {
      const matched = availableMap.get(timeStr);
      const isAvailable = Boolean(matched);

      return {
        timeStr,
        displayTime: format12h(timeStr),
        barberId: matched?.barberId || "any",
        isAvailable,
      };
    });
  }, [availableSlots, currentSlotTimes]);

  // Selected date object & formatted header
  const activeDateObj = useMemo(() => {
    const matched = weekDays.find((d) => d.dateStr === selectedDate);
    if (matched) return matched.dateObj;
    return new Date();
  }, [weekDays, selectedDate]);

  const activeDateFormatted = useMemo(() => {
    const weekday = activeDateObj.toLocaleDateString("en-US", { weekday: "short" });
    const month = activeDateObj.toLocaleDateString("en-US", { month: "short" });
    const day = activeDateObj.toLocaleDateString("en-US", { day: "numeric" });
    const startTime = selectedSlot ? selectedSlot.displayTime : "9:00 AM";
    const endTime = selectedSlot
      ? calculateEndTime(selectedSlot.timeStr, serviceDurationMinutes)
      : "9:30 AM";

    return `${weekday}, ${month} ${day}, ${startTime} to ${endTime}`;
  }, [activeDateObj, selectedSlot, serviceDurationMinutes]);

  // Equivalent Ethiopian Calendar Date
  const ethiopianDateName = useMemo(() => {
    const eth = toEthiopianDate(activeDateObj);
    return `${eth.monthName} ${eth.day}, ${eth.year} E.C.`;
  }, [activeDateObj]);

  const handleSlotClick = (slot: {
    timeStr: string;
    displayTime: string;
    barberId: string;
    isAvailable: boolean;
  }) => {
    if (slot.isAvailable) {
      onSelectSlot({
        timeStr: slot.timeStr,
        displayTime: slot.displayTime,
        barberId: slot.barberId,
      });
    }
  };

  return (
    <div className="relative w-full max-w-[460px] mx-auto select-none">
      {/* Main White Card matching reference image */}
      <div className="relative bg-white rounded-3xl sm:rounded-[28px] p-6 sm:p-7 shadow-[0_16px_48px_rgba(20,20,40,0.06)] border border-[#e8e8ed] flex flex-col gap-4 overflow-hidden">
        {/* 1. Header: "Pick a time" & Date Range + Navigation Arrows */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <h2 className="text-xl sm:text-[22px] font-bold text-[#111118] tracking-tight">
              Pick a time
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#737380] mt-0.5">
              {weekRangeLabel}
            </p>
          </div>

          {/* Navigation Arrows matching reference image */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevWeek}
              disabled={weekOffset === 0}
              className="w-8 h-8 rounded-xl border border-[#e5e5ea] bg-white flex items-center justify-center text-[#555566] hover:text-[#111118] hover:bg-[#f6f6f9] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              aria-label="Previous week"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNextWeek}
              className="w-8 h-8 rounded-xl border border-[#e5e5ea] bg-white flex items-center justify-center text-[#555566] hover:text-[#111118] hover:bg-[#f6f6f9] transition-all cursor-pointer"
              aria-label="Next week"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* 2. 1-Week Strip (7 Days with Solid System Color and 4 availability dots) */}
        <div className="grid grid-cols-7 gap-1 items-center text-center pt-1 pb-1">
          {weekDays.map((item) => {
            const isSelected = selectedDate === item.dateStr;

            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => onSelectDate(item.dateStr)}
                className={`relative flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-[#5b4cff] text-white shadow-md scale-[1.02]"
                    : "text-[#1a1a24] hover:bg-[#f5f5f8]"
                }`}
                aria-label={`Select ${item.weekday} ${item.dayNum}`}
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isSelected ? "text-white/80" : "text-[#888899]"
                  }`}
                >
                  {item.weekday}
                </span>

                <span className="text-base sm:text-lg font-bold my-0.5 tracking-tight">
                  {item.dayNum}
                </span>

                {/* 4 Availability Dots */}
                <span
                  className={`text-[8px] tracking-[2px] leading-none select-none font-black ${
                    isSelected ? "text-white/90" : "text-[#c8c8d0]"
                  }`}
                >
                  ••••
                </span>
              </button>
            );
          })}
        </div>

        {/* 3. AM / PM Switcher (Replaces slots in place without expanding layout) */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#f0f0f4]">
          <span className="text-xs font-bold text-[#737380] uppercase tracking-wider">
            {activePeriod === "AM" ? "Morning Slots" : "Afternoon (to 5:00 PM)"}
          </span>

          <div className="inline-flex p-1 bg-[#f1f1f4] rounded-2xl border border-[#e5e5ea]">
            <button
              type="button"
              onClick={() => setActivePeriod("AM")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activePeriod === "AM"
                  ? "bg-white text-[#5b4cff] shadow-xs"
                  : "text-[#666677] hover:text-[#111118]"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
              <span>AM</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePeriod("PM")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activePeriod === "PM"
                  ? "bg-white text-[#5b4cff] shadow-xs"
                  : "text-[#666677] hover:text-[#111118]"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
              <span>PM (to 5 PM)</span>
            </button>
          </div>
        </div>

        {/* 4. Grid of Time Slots (3 Columns matching reference mockup) */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 py-1 min-h-[160px] content-start">
          {currentSlots.map((slot) => {
            const isSelected = selectedSlot?.timeStr === slot.timeStr;

            // State A: Selected Slot (Solid System Color #5b4cff)
            if (isSelected) {
              return (
                <button
                  key={slot.timeStr}
                  type="button"
                  onClick={() => handleSlotClick(slot)}
                  className="h-11 sm:h-12 rounded-2xl font-bold text-xs sm:text-sm text-white bg-[#5b4cff] shadow-sm flex items-center justify-center transition-all cursor-pointer"
                  aria-label={`Selected: ${slot.displayTime}`}
                >
                  <span>{slot.displayTime}</span>
                </button>
              );
            }

            // State B: Available Slot (Crisp White Card with soft border)
            if (slot.isAvailable) {
              return (
                <button
                  key={slot.timeStr}
                  type="button"
                  onClick={() => handleSlotClick(slot)}
                  className="h-11 sm:h-12 rounded-2xl font-bold text-xs sm:text-sm text-[#111118] bg-white border border-[#e5e5ea] hover:border-[#5b4cff] hover:bg-[#fafafc] active:scale-95 transition-all shadow-2xs flex items-center justify-center cursor-pointer"
                  aria-label={`Available: ${slot.displayTime}`}
                >
                  {slot.displayTime}
                </button>
              );
            }

            // State C: Reserved Slot (Blocked Sign: BlockIcon + strikethrough matching mockup)
            return (
              <div
                key={slot.timeStr}
                className="h-11 sm:h-12 rounded-2xl font-medium text-xs sm:text-sm text-[#8e8e99] bg-[#f8f8fa] border border-dashed border-[#e2e2e8] flex items-center justify-center gap-1.5 cursor-not-allowed select-none"
                aria-label={`Blocked slot: ${slot.displayTime}`}
              >
                <BlockIcon size={13} color="#9fa0ab" className="shrink-0" />
                <span className="line-through decoration-[#9fa0ab]/70 font-semibold">
                  {slot.displayTime}
                </span>
              </div>
            );
          })}
        </div>

        {/* Thin Divider Line */}
        <div className="border-t border-[#f0f0f4] my-0.5" />

        {/* 5. Time Zone Display */}
        <div className="flex items-center gap-1.5 text-xs text-[#737380]">
          <GlobeIcon size={14} color="#777785" className="shrink-0" />
          <span>Times shown in {timeZoneString}</span>
        </div>

        {/* 6. Footer Bar: Gregorian & Ethiopian Calendar Date + Countdown + "Proceed" Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-col min-w-0">
            {/* Bold Gregorian & Bold Ethiopian Calendar Date */}
            <div className="text-xs sm:text-sm font-bold text-[#111118] flex items-center gap-1.5 flex-wrap">
              <span>{activeDateFormatted}</span>
              <span className="text-gray-300 font-normal">•</span>
              <span className="text-[#5b4cff] font-bold">{ethiopianDateName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#737380] font-medium mt-1">
              <ClockIcon size={13} color="#888899" className="shrink-0" />
              <span>{countdownString}</span>
            </div>
          </div>

          {/* Action Button: "Proceed" in Solid Brand Color */}
          <button
            type="button"
            onClick={onConfirm}
            className="shrink-0 px-6 py-2.5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm text-white bg-[#5b4cff] hover:bg-[#4a3fe6] shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Proceed</span>
            <span className="text-sm">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
