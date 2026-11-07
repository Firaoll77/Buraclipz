"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch("/api/services");
        const data = await res.json();
        // Filter out unwanted services
        const unwantedServiceIds = ["srv-combo", "srv-massage", "srv-executive"];
        const filteredServices = (data.services || []).filter(
          (s: Service) => !unwantedServiceIds.includes(s.id)
        );
        setServices(filteredServices);
      } catch (err) {
        console.error("Failed to fetch services:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  return (
    <main className="flex-1 flex flex-col gap-12 pb-12">
      {/* Logo Section */}
      <div className="flex flex-col items-center justify-center pt-8 pb-2">
        <div className="flex flex-col items-center gap-3">
          <div className="w-32 h-32 sm:w-48 sm:h-48 lg:w-56 lg:h-56 rounded-full overflow-hidden border-4 border-[#5b4cff] shadow-lg">
            <img
              src="/logo.png"
              alt="Buraclipz Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-[#0f0f14] tracking-tight">
            Buraclipz
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="py-16 text-center text-[#666666]">
              Loading services...
            </div>
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
                  <span className="text-xs font-medium text-[#666666]">
                    ⏱ {s.durationMinutes} min
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
