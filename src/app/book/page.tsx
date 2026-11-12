"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import BookingFlow from "@/components/BookingFlow";

function BookContent() {
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("serviceId") || undefined;

  return (
    <main className="flex-1 flex flex-col gap-8 py-8 px-4">
      <section className="flex flex-col gap-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0f0f14]">
              Book an Appointment
            </h2>
          </div>
        </div>
        <BookingFlow preselectedServiceId={serviceId} />
      </section>
    </main>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <main className="flex-1 flex flex-col gap-8 py-8 px-4">
        <section className="flex flex-col gap-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="card-light p-4 sm:p-6 flex flex-col gap-6">
            <div className="flex flex-col gap-3 pb-4 border-b border-[#e5e5e5]">
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex flex-col gap-3 items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-[#5b4cff] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#666666] font-medium">Loading booking...</p>
            </div>
          </div>
        </section>
      </main>
    }>
      <BookContent />
    </Suspense>
  );
}
