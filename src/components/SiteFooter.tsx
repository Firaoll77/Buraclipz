"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ScissorsIcon,
  LocationIcon,
  PhoneIcon,
  ClockIcon,
} from "@/components/icons/Hugeicons";
import { useState } from "react";

export default function SiteFooter() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  // Accordion open/close states for mobile view (default to "location" so map is visible)
  const [openSection, setOpenSection] = useState<string | null>("location");

  // Don't show public footer inside admin dashboard
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const toggleSection = (section: string) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  return (
    <footer className="w-full bg-[#0f0f14] text-white border-t border-gray-800 mt-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP VIEW (md: and above)
          Spacious layout with integrated interactive Ayat 49 map
          ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex w-full max-w-[1440px] mx-auto px-6 lg:px-10 py-10 lg:py-12 flex-col gap-8">
        {/* 3 Functional Sections */}
        <div className="grid grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Col 1: Brand & Identity & Nav (4 cols) */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#5b4cff] text-white font-bold text-xl flex items-center justify-center shadow-md shrink-0">
                BC
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-white tracking-tight leading-none">
                    360°_Bladez 
                  </span>
                  <span className="bg-[#5b4cff]/20 text-[#a59bff] border border-[#5b4cff]/40 text-xs font-bold px-2 py-0.5 rounded-full">
                    ETB
                  </span>
                </div>
                <span className="text-sm text-gray-400 mt-1">
                  360°_Bladez  &middot; Ayat 49
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              Own your style, embrace your power. Premium grooming, master fades, and hot towel treatments in the heart of Addis Ababa.
            </p>

            <nav className="flex items-center gap-4 text-sm text-gray-300 pt-1">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <span className="text-gray-700">&bull;</span>
              <Link href="/book" className="text-[#a59bff] font-semibold hover:underline">
                Book Appointment
              </Link>
              <span className="text-gray-700">&bull;</span>
              <Link href="/location" className="hover:text-white transition-colors">
                Directions
              </Link>
            </nav>
          </div>

          {/* Col 2: Hours & Contact Info (3 cols) */}
          <div className="col-span-6 lg:col-span-3 flex flex-col gap-4 border-l border-gray-800/80 pl-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <ClockIcon size={14} className="text-[#5b4cff]" />
              <span>Hours &amp; Contact</span>
            </h3>
            <div className="flex flex-col gap-1.5 text-xs text-gray-300">
              <p>
                <strong className="text-gray-200">Mon &ndash; Sat:</strong> 9:00 AM &ndash; 8:00 PM
              </p>
              <p>
                <strong className="text-gray-200">Sunday:</strong> 10:00 AM &ndash; 6:00 PM
              </p>
              <p className="text-[11px] text-gray-500 pt-0.5">East Africa Time (UTC+3)</p>
            </div>

            <div className="pt-2 border-t border-gray-800/60 flex flex-col gap-2">
              <a
                href="tel:+251 96 618 4635"
                className="inline-flex items-center gap-2 text-sm text-[#5b4cff] hover:text-[#7d71ff] font-semibold"
              >
                <PhoneIcon size={14} />
                <span>+251 96 618 4635</span>
              </a>
              <p className="text-[11px] text-gray-400">
                Pay at shop: Cash, Telebirr &amp; CBE Birr
              </p>
            </div>
          </div>

          {/* Col 3: Shop Location & Embedded Google Map (5 cols) */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-3 border-l border-gray-800/80 pl-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <LocationIcon size={14} className="text-[#5b4cff]" />
                  <span>Shop Location &middot; Ayat 49</span>
                </h3>
                <p className="text-xs text-gray-300 mt-1">
                  Ayat 49, Yeka Sub-City, Addis Ababa (Near Ayat Mazoriya &amp; LRT)
                </p>
              </div>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Ayat+49+Addis+Ababa"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-[#a59bff] hover:underline shrink-0"
              >
                Open Maps ↗
              </a>
            </div>

            <div className="w-full h-44 rounded-xl overflow-hidden border border-gray-800 shadow-sm mt-1">
              <iframe
                title="360°_Bladez Location Ayat 49"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://maps.google.com/maps?q=Ayat+49,+Addis+Ababa,+Ethiopia&t=&z=15&ie=UTF8&iwloc=&output=embed"
              />
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright */}
        <div className="pt-6 border-t border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <p>© {year} 360°_Bladez. All rights reserved. Ayat 49, Addis Ababa, Ethiopia.</p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE VIEW (< md)
          100% width, expandable accordions (+ / -)
          ───────────────────────────────────────────────────────────── */}
      <div className="md:hidden w-full px-4 py-5 flex flex-col gap-3">
        {/* Compact Header */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#5b4cff] text-white font-bold text-base flex items-center justify-center shadow-sm">
              BC
            </div>
            <div>
              <span className="text-base font-bold text-white block leading-tight">360°_Bladez</span>
              <span className="text-xs text-gray-400">Ayat 49, Addis Ababa</span>
            </div>
          </div>
          <a
            href="tel:+251 96 618 4635"
            className="text-xs font-semibold bg-[#5b4cff] hover:bg-[#4a3fe6] text-white px-3 py-1.5 rounded-lg shadow-sm"
          >
            Call Shop
          </a>
        </div>

        {/* Accordion 1: Quick Links */}
        <div className="border border-gray-800 rounded-xl overflow-hidden bg-[#16161f]">
          <button
            onClick={() => toggleSection("nav")}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-200"
            aria-expanded={openSection === "nav"}
          >
            <span className="flex items-center gap-2">
              <ScissorsIcon size={16} className="text-[#a59bff]" />
              Quick Navigation
            </span>
            <span className="text-base font-bold text-[#5b4cff]">
              {openSection === "nav" ? "−" : "+"}
            </span>
          </button>
          {openSection === "nav" && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-800/60 grid grid-cols-2 gap-2.5 text-sm text-gray-400">
              <Link href="/" className="hover:text-white">Home Page</Link>
              <Link href="/book" className="text-[#a59bff] font-semibold">Book Now</Link>
              <Link href="/services" className="hover:text-white">Services &amp; Pricing</Link>
            </div>
          )}
        </div>

        {/* Accordion 2: Shop Location & Directions */}
        <div className="border border-gray-800 rounded-xl overflow-hidden bg-[#16161f]">
          <button
            onClick={() => toggleSection("location")}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-200"
            aria-expanded={openSection === "location"}
          >
            <span className="flex items-center gap-2">
              <LocationIcon size={16} className="text-[#a59bff]" />
              Shop Location &amp; Directions
            </span>
            <span className="text-base font-bold text-[#5b4cff]">
              {openSection === "location" ? "−" : "+"}
            </span>
          </button>
          {openSection === "location" && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-800/60 text-xs text-gray-300 space-y-2.5">
              <p className="text-gray-400">
                Ayat 49, Yeka Sub-City, Addis Ababa, Ethiopia
              </p>
              <p className="flex items-center gap-1.5">
                <PhoneIcon size={14} className="text-[#5b4cff] shrink-0" />
                <span>Direct Phone: </span>
                <a href="tel:+251 96 618 4635" className="text-[#5b4cff] font-semibold underline">
                  +251 96 618 4635
                </a>
              </p>
              <div className="w-full h-40 rounded-lg overflow-hidden border border-gray-700 mt-2">
                <iframe
                  title="360°_Bladez Map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src="https://maps.google.com/maps?q=Ayat+49,+Addis+Ababa,+Ethiopia&t=&z=15&ie=UTF8&iwloc=&output=embed"
                />
              </div>
              <div className="pt-1 text-right">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Ayat+49+Addis+Ababa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#a59bff] font-semibold hover:underline"
                >
                  Open in Google Maps ↗
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Accordion 3: Payments & Hours */}
        <div className="border border-gray-800 rounded-xl overflow-hidden bg-[#16161f]">
          <button
            onClick={() => toggleSection("payment")}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-200"
            aria-expanded={openSection === "payment"}
          >
            <span>Payment &amp; Shop Hours</span>
            <span className="text-base font-bold text-[#5b4cff]">
              {openSection === "payment" ? "−" : "+"}
            </span>
          </button>
          {openSection === "payment" && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-800/60 text-xs text-gray-300 space-y-2">
              <p className="text-gray-400">
                • <strong className="text-white">Pay at shop:</strong> Cash, Telebirr, or CBE Birr.
              </p>
              <p className="text-gray-400">
                • <strong className="text-white">Mon &ndash; Sat:</strong> 9:00 AM &ndash; 8:00 PM.
              </p>
              <p className="text-gray-400">
                • <strong className="text-white">Sunday:</strong> 10:00 AM &ndash; 6:00 PM.
              </p>
              <p className="text-gray-400">
                • <strong className="text-white">Currency:</strong> Ethiopian Birr (ETB).
              </p>
            </div>
          )}
        </div>

        {/* Mobile Copyright Footer */}
        <div className="pt-3 text-center text-xs text-gray-400 border-t border-gray-800/60">
          <p>© {year} 360°_Bladez &middot; Ayat 49 &middot; UTC+3</p>
        </div>
      </div>
    </footer>
  );
}
