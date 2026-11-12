"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ClockIcon } from "@/components/icons/Hugeicons";

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceEtb: number;
}

export default function HomePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // 3D Zero-Gravity Cursor Tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !logoRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const rotateX = (-y / rect.height) * 30;
    const rotateY = (x / rect.width) * 30;

    logoRef.current.style.transform = `scale(1.12) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(30px)`;
    logoRef.current.style.filter = "drop-shadow(0 0 25px rgba(138, 43, 226, 0.85)) drop-shadow(0 0 12px rgba(0, 245, 255, 0.7))";
  };

  const handleMouseLeave = () => {
    if (!logoRef.current) return;
    logoRef.current.style.transform = "scale(1) rotateX(0deg) rotateY(0deg) translateZ(0px)";
    logoRef.current.style.filter = "";
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current || !logoRef.current || !e.touches[0]) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left - rect.width / 2;
    const y = touch.clientY - rect.top - rect.height / 2;

    const rotateX = (-y / rect.height) * 25;
    const rotateY = (x / rect.width) * 25;

    logoRef.current.style.transform = `scale(1.12) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(30px)`;
    logoRef.current.style.filter = "drop-shadow(0 0 25px rgba(138, 43, 226, 0.85)) drop-shadow(0 0 12px rgba(0, 245, 255, 0.7))";
  };

  const handleTouchEnd = () => {
    if (!logoRef.current) return;
    logoRef.current.style.transform = "scale(1) rotateX(0deg) rotateY(0deg) translateZ(0px)";
    logoRef.current.style.filter = "";
  };

  useEffect(() => {
    let mounted = true;
    async function fetchServices() {
      try {
        const res = await fetch("/api/services", { cache: "no-store" });
        const data = await res.json();
        if (mounted) {
          // Deduplicate services by ID to prevent duplicates
          const uniqueServices = (data.services || []).filter(
            (service: Service, index: number, self: Service[]) =>
              index === self.findIndex((s) => s.id === service.id)
          );
          setServices(uniqueServices);
        }
      } catch (err) {
        console.error("Failed to fetch services:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    fetchServices();
    return () => { mounted = false; };
  }, []);

  return (
    <main className="flex-1 flex flex-col gap-12 pb-12">
      {/* Logo Section - Zero-Gravity Quantum Core */}
      <div className="flex flex-col items-center justify-center pt-8 pb-2">
        <div className="flex flex-col items-center gap-3">
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="antigravity-logo-container p-3 sm:p-4"
            aria-label="360° Bladez 3D Quantum Core Logo"
          >
            {/* Faint drifting digital dust particles */}
            <span className="quantum-particle-1 absolute -top-1 left-4 w-2 h-2 rounded-full bg-[#00f5ff]/60 blur-[1px] pointer-events-none" />
            <span className="quantum-particle-2 absolute top-8 -right-2 w-2.5 h-2.5 rounded-full bg-[#8a2be2]/70 blur-[1px] pointer-events-none" />
            <span className="quantum-particle-3 absolute -bottom-2 left-6 w-1.5 h-1.5 rounded-full bg-[#00f5ff]/70 blur-[1px] pointer-events-none" />
            <span className="quantum-particle-1 absolute bottom-4 -right-1 w-2 h-2 rounded-full bg-[#8a2be2]/60 blur-[1px] pointer-events-none" />

            {/* 3D Floating Logo */}
            <div
              ref={logoRef}
              className="antigravity-logo-3d w-32 h-32 sm:w-48 sm:h-48 lg:w-56 lg:h-56 rounded-full overflow-hidden border-4 border-[#5b4cff] shadow-xl relative"
            >
              <img
                src="/bc.png"
                alt="Bura Clipz logo"
                className="w-full h-full object-cover scale-[1.08] select-none pointer-events-none"
              />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-[#0f0f14] tracking-tight">
            Bura Clipz
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-4 sm:py-12 lg:py-16 flex flex-col items-center justify-center gap-8">
        <div className="flex flex-col gap-6 text-center max-w-3xl px-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0f0f14] leading-tight">
            Stay Fresh. <span className="text-[#5b4cff]">Stay Different.</span>
          </h1>

          <p className="text-sm sm:text-base text-[#666666] leading-relaxed max-w-xl mx-auto">
            We make every cut count. Come in for the cut, leave with the confidence.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/book"
              className="btn-primary"
            >
              Book an Appointment
            </Link>
          </div>
        </div>
      </section>

      {/* Haircuts Section */}
      <section className="flex flex-col gap-8 px-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0f0f14]">
              Haircuts
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            // Skeleton loaders
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="card-light flex flex-col justify-between gap-4 p-6 animate-pulse"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="h-6 w-20 bg-gray-200 rounded" />
                  </div>
                  <div className="h-6 w-32 bg-gray-200 rounded" />
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-[#e5e5e5]">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                </div>
              </div>
            ))
          ) : (
            services.map((s) => (
              <div
                key={s.id}
                className="card-light flex flex-col justify-between gap-4 p-6"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-semibold text-[#5b4cff]">
                      {s.priceEtb} ETB
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-[#0f0f14] leading-tight">
                    {s.name}
                  </h3>

                  <p className="text-sm text-[#666666] leading-relaxed">
                    {s.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#e5e5e5]">
                  <span className="text-xs font-medium text-[#666666] flex items-center gap-1.5">
                    <ClockIcon size={13} strokeWidth={1.8} />
                    <span>{s.durationMinutes} min</span>
                  </span>
                  <Link
                    href={`/book?serviceId=${s.id}`}
                    className="text-sm font-medium text-[#5b4cff] hover:text-[#4a3fe6] flex items-center gap-2"
                  >
                    Book →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
