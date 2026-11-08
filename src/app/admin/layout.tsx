"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DashboardIcon,
  CalendarIcon,
  ClipboardListIcon,
  ScissorsIcon,
  GlobeIcon,
  LogoutIcon,
} from "@/components/icons/Hugeicons";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: <DashboardIcon size={18} />, exact: true },
  { href: "/admin/schedule", label: "Schedule", icon: <CalendarIcon size={18} /> },
  { href: "/admin/bookings", label: "Bookings", icon: <ClipboardListIcon size={18} /> },
  { href: "/admin/services", label: "Services", icon: <ScissorsIcon size={18} /> },
];

function NavLink({
  href,
  label,
  icon,
  exact,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
      style={{
        background: isActive ? "#ff9800" : "transparent",
        color: isActive ? "white" : "#333",
      }}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <nav className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-6 border-b" style={{ borderColor: "#e0e0e0" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "#ff9800" }}
          >
            BC
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "#000" }}>Buraclipz</p>
            <p className="text-xs" style={{ color: "#666" }}>Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} onClick={onClose} />
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t" style={{ borderColor: "#e0e0e0" }}>
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-1 transition-colors hover:bg-gray-100"
          style={{ color: "#555" }}
        >
          <GlobeIcon size={18} />
          <span>View Site</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-red-50"
          style={{ color: "#d32f2f" }}
        >
          <LogoutIcon size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Do not render the sidebar or admin chrome on the sign-in / login page
  if (pathname === "/admin/login") {
    return (
      <div data-admin-root="true" className="min-h-screen">
        {children}
      </div>
    );
  }

  return (
    <div data-admin-root="true" className="min-h-screen flex" style={{ background: "#f5f5f5" }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-56 shrink-0 border-r"
        style={{ background: "white", borderColor: "#e0e0e0" }}
      >
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="relative z-50 flex flex-col w-64 border-r"
            style={{ background: "white", borderColor: "#e0e0e0" }}
          >
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (mobile) */}
        <header
          className="lg:hidden flex items-center gap-4 px-4 py-3 border-b"
          style={{ background: "white", borderColor: "#e0e0e0" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl"
            style={{ minWidth: 44, minHeight: 44 }}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-semibold text-sm">Buraclipz Admin</span>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

