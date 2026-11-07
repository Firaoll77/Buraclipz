"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function SiteFooter() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  // Accordion open/close states for mobile view (collapsed by default)
  const [openSection, setOpenSection] = useState<string | null>(null);

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
          100% width, full-featured spacious 4-column footer
          ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex w-full max-w-[1440px] mx-auto px-6 lg:px-10 py-10 lg:py-12 flex-col gap-8">
        {/* 4 Functional Columns */}
        <div className="grid grid-cols-12 gap-8 lg:gap-10">
          {/* Col 1: Brand & Identity (4 cols) */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#5b4cff] text-white font-bold text-xl flex items-center justify-center shadow-md shrink-0">
                AB
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-white tracking-tight leading-none">
                    Buraclipz
                  </span>
                  <span className="bg-[#5b4cff]/20 text-[#a59bff] border border-[#5b4cff]/40 text-xs font-bold px-2 py-0.5 rounded-full">
                    ETB
                  </span>
                </div>
                <span className="text-sm text-gray-400 mt-1">
                  Arada Barbershop &middot; Bole Medhanialem
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              Own your style, embrace your power. Premium grooming, master fades, and hot towel treatments in the heart of Addis Ababa.
            </p>
          </div>

          {/* Col 2: Navigation Links (3 cols) */}
          <div className="col-span-6 lg:col-span-3 flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Quick Navigation
            </h3>
            <nav className="flex flex-col gap-2.5 text-sm text-gray-300">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/book" className="text-[#a59bff] font-semibold hover:underline">
                Book an Appointment
              </Link>
            </nav>
          </div>

          {/* Col 3: Shop Location & Hours (3 cols) */}
          <div className="col-span-6 lg:col-span-3 flex flex-col gap-3 border-l border-gray-800/80 pl-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Location &amp; Hours
            </h3>
            <div className="flex flex-col gap-2 text-sm text-gray-300">
              <p className="leading-snug">
                <strong className="text-white">Bole Medhanialem</strong>
                <br />
                <span className="text-gray-400 text-xs">Cameroon St (Next to Morning Star Mall), Addis Ababa</span>
              </p>
              <div className="mt-1 pt-2 border-t border-gray-800/60 text-xs text-gray-400 space-y-1">
                <p>
                  <strong className="text-gray-200">Mon &ndash; Sat:</strong> 9:00 AM &ndash; 8:00 PM
                </p>
                <p>
                  <strong className="text-gray-200">Sunday:</strong> 10:00 AM &ndash; 6:00 PM
                </p>
                <p className="text-[11px] text-gray-500 pt-0.5">
                  East Africa Time (UTC+3)
                </p>
              </div>
            </div>
          </div>

          {/* Col 4: Contact & Payment Call-to-Action (2 cols) */}
          <div className="col-span-12 lg:col-span-2 flex flex-col gap-3 border-l border-gray-800/80 pl-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Get in Touch
            </h3>
            <div className="flex flex-col gap-3">
              <a
                href="tel:+251911223344"
                className="inline-flex items-center justify-center gap-2 bg-[#5b4cff] hover:bg-[#4a3fe6] text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm"
              >
                <span>Phone</span> +251 911 223 344
              </a>
              <div className="text-xs text-gray-400 space-y-1">
                <p className="font-medium text-gray-300"> Pay at Shop:</p>
                <p className="text-[11px] text-gray-400">Cash, Telebirr &amp; CBE Birr</p>
                <p className="text-[11px] text-gray-400">All prices in ETB</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Addis Time Synchronization */}
        <div className="pt-6 border-t border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <p>© {year} (Buraclipz). All rights reserved. Addis Ababa, Ethiopia.</p>
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
              AB
            </div>
            <div>
              <span className="text-base font-bold text-white block leading-tight">Buraclipz</span>
              <span className="text-xs text-gray-400">Bole Medhanialem, Addis Ababa</span>
            </div>
          </div>
          <a
            href="tel:+251911223344"
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
            <span>💈 Quick Navigation</span>
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
            <span>📍 Shop Location &amp; Directions</span>
            <span className="text-base font-bold text-[#5b4cff]">
              {openSection === "location" ? "−" : "+"}
            </span>
          </button>
          {openSection === "location" && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-800/60 text-xs text-gray-300 space-y-2.5">
              <p className="text-gray-400">
                Cameroon Street, Bole Medhanialem (Next to Morning Star Mall), Addis Ababa, Ethiopia
              </p>
              <p>
                📞 Direct Phone:{" "}
                <a href="tel:+251911223344" className="text-[#5b4cff] font-semibold underline">
                  +251 911 223 344
                </a>
              </p>
              <div className="w-full h-36 rounded-lg overflow-hidden border border-gray-700 mt-2">
                <iframe
                  title="Arada Barbershop Map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3940.660144675549!2d38.7844089!3d8.9951804!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x164b84fd62947477%3A0xe54d9c7e3aa037a5!2sBole%20Medhanialem%20Church!5e0!3m2!1sen!2set"
                />
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
          <p>© {year} Arada Barbershop &middot; Bole Medhanialem &middot; UTC+3</p>
        </div>
      </div>
    </footer>
  );
}
