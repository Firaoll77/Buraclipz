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
    <Suspense fallback={<div className="p-8 text-center text-gray-500 font-medium">Loading booking...</div>}>
      <BookContent />
    </Suspense>
  );
}
