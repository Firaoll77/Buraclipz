"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { formatDualDate } from "@/lib/ethiopian-calendar";

export default function SiteHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const today = new Date();
  const dateInfo = formatDualDate(today);

  // Don't show public header inside admin
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/gallery", label: "Gallery" },
    { href: "/location", label: "Location" },
    { href: "/hours", label: "Hours" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header className="w-full mb-30 pt-30">
      {/* Main Navbar */}
      <div className="flex items-center justify-between py-10">
        {/* Brand Logo in Staatliches */}
        <Link href="/" className="flex items-center gap-12 group">
          <div className="w-44 h-44 rounded-pill bg-[#ff8442] text-black font-heading text-2xl flex items-center justify-center border-2 border-[#141414] shadow-[2px_3px_0px_#141414] group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform shrink-0">
            BC
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-2xl sm:text-3xl tracking-normal text-[#000000] leading-none">
              BURACLIPZ
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666] mt-1">
              Addis Ababa • Est. 2024
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-10">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-bold text-xs uppercase tracking-wider px-15 py-8 rounded-pill transition-all ${
                  isActive
                    ? "bg-[#0a0a0a] text-white shadow-[2px_3px_0px_#ff8442]"
                    : "text-[#000000] hover:bg-black/5"
                }`}
                style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/#book"
            className="btn-primary text-xs uppercase tracking-wider ml-10"
            style={{ minHeight: 44 }}
          >
            Book Appointment
          </Link>
        </nav>

        {/* Mobile / Tablet Controls */}
        <div className="flex lg:hidden items-center gap-10">
          <Link
            href="/#book"
            className="btn-primary text-xs uppercase tracking-wider px-15 py-8"
            style={{ minHeight: 44 }}
          >
            Book
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-44 h-44 rounded-pill bg-[#ffffff] border-2 border-[#141414] shadow-[2px_2px_0px_#141414] flex items-center justify-center text-black"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-15 card-dark p-20 flex flex-col gap-10 animate-in fade-in duration-150">
          <span className="text-[11px] uppercase tracking-wider text-gray-400 font-bold px-10">
            Navigation Menu
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-5">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`btn-pill text-sm justify-start px-20 ${
                    isActive
                      ? "bg-[#ff8442] text-black"
                      : "bg-[#141414] text-white hover:bg-[#222222]"
                  }`}
                  style={{ minHeight: 44 }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="pt-4 mt-5 border-t border-[#333333] flex items-center justify-between text-xs text-gray-400 px-5">
            <a href="tel:+251911223344" className="hover:text-white transition-colors">
              📞 +251 911 223 344
            </a>
            <span className="text-gray-500">Bole Medhanialem</span>
          </div>
        </div>
      )}
    </header>
  );
}
