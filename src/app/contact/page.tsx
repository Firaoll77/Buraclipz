"use client";

import { useState } from "react";
import Link from "next/link";
import { validateEthiopianPhone } from "@/lib/phone";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+251");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateEthiopianPhone(phone)) {
      setError("Please provide a valid Ethiopian mobile number (+251 9XX or +251 7XX).");
      return;
    }

    if (!name.trim() || !message.trim()) {
      setError("Please fill in your name and message.");
      return;
    }

    setSubmitted(true);
  };

  return (
    <main className="flex-1 flex flex-col gap-30 pb-40">
      {/* Title Banner */}
      <div className="card-light p-28 sm:p-40 flex flex-col gap-12 bg-[#faf5ea] border-2 border-[#141414]">
        <div className="flex items-center gap-10">
          <span className="badge-purple">Direct Help</span>
          <span className="badge-accent">Addis Ababa Shop</span>
        </div>
        <h1 className="font-heading text-4xl sm:text-6xl text-[#000000] tracking-tight uppercase">
          Contact Arada Barbershop
        </h1>
        <p className="text-sm sm:text-base text-[#666666] max-w-2xl leading-relaxed font-medium">
          Questions about styling, wedding group bookings, or need immediate assistance? Reach our barbershop in Addis Ababa directly via phone, Telegram, or through the message form below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
        {/* Direct Channels */}
        <div className="flex flex-col gap-20">
          <div className="card-dark p-28 flex flex-col gap-15 border-2 border-[#141414]">
            <h2 className="font-heading text-2xl text-white border-b border-[#222222] pb-10">
              Direct Contact Channels
            </h2>
            <div className="flex flex-col gap-12 text-sm text-gray-300">
              {/* Phone */}
              <div className="flex items-center justify-between p-15 rounded-card bg-[#141414] border border-[#262626]">
                <div className="flex items-center gap-10">
                  <span className="text-2xl">📞</span>
                  <div>
                    <span className="text-xs text-gray-400 block font-medium">Phone Calls &amp; SMS</span>
                    <span className="font-mono font-bold text-white text-sm">+251 911 223 344</span>
                  </div>
                </div>
                <a
                  href="tel:+251911223344"
                  className="btn-primary text-xs uppercase tracking-wider font-extrabold px-15 py-6"
                  style={{ minHeight: 40 }}
                >
                  Call Now
                </a>
              </div>

              {/* Telegram */}
              <div className="flex items-center justify-between p-15 rounded-card bg-[#141414] border border-[#262626]">
                <div className="flex items-center gap-10">
                  <span className="text-2xl">✈️</span>
                  <div>
                    <span className="text-xs text-gray-400 block font-medium">Telegram Bot &amp; Support</span>
                    <span className="font-semibold text-white text-sm">@AradaBarberBot</span>
                  </div>
                </div>
                <a
                  href="https://t.me/AradaBarberBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-pill text-xs uppercase tracking-wider font-extrabold px-15 py-6"
                  style={{ minHeight: 40 }}
                >
                  Open Telegram
                </a>
              </div>

              {/* Location */}
              <div className="flex items-center justify-between p-15 rounded-card bg-[#141414] border border-[#262626]">
                <div className="flex items-center gap-10">
                  <span className="text-2xl">📍</span>
                  <div>
                    <span className="text-xs text-gray-400 block font-medium">Shop Location</span>
                    <span className="font-medium text-white text-sm">Bole Medhanialem, Cameroon St</span>
                  </div>
                </div>
                <Link
                  href="/location"
                  className="btn-secondary text-xs uppercase tracking-wider font-bold px-15 py-6"
                  style={{ minHeight: 40 }}
                >
                  View Map
                </Link>
              </div>
            </div>
          </div>

          {/* Manage Booking Callout */}
          <div className="card-light p-28 flex flex-col gap-10 border-2 border-[#141414]">
            <h3 className="font-heading text-xl text-[#000000]">Already booked an appointment?</h3>
            <p className="text-xs text-[#666666] leading-relaxed font-medium">
              You do not need to call to reschedule or cancel! Click your private confirmation link sent via SMS, Telegram, or email. You can modify your slot self-service up to 2 hours before your cut.
            </p>
          </div>
        </div>

        {/* Send Inquiry Form */}
        <div className="card-light p-28 flex flex-col gap-15 border-2 border-[#141414]">
          <h2 className="font-heading text-2xl text-[#000000] border-b-2 border-[#141414] pb-10">
            Send an Inquiry
          </h2>

          {submitted ? (
            <div className="bg-[#faf5ea] p-30 rounded-card border-2 border-[#141414] flex flex-col items-center justify-center text-center gap-12 my-auto shadow-[3px_4px_0px_#141414]">
              <span className="text-5xl">✅</span>
              <h3 className="font-heading text-3xl text-[#000000]">Message Received!</h3>
              <p className="text-xs text-[#666666] leading-relaxed font-medium max-w-sm">
                Ameseginalehu (Thank you), {name}! Our team will get back to you at {phone} promptly.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setName("");
                  setPhone("+251");
                  setMessage("");
                }}
                className="btn-primary text-xs uppercase tracking-wider font-extrabold px-20 py-10 mt-10"
                style={{ minHeight: 44 }}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-15">
              <div className="flex flex-col gap-5">
                <label className="font-heading text-base text-[#000000]">
                  Full Name <span className="text-[#ff8442]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Haile Gebre"
                  className="input-standard"
                />
              </div>

              <div className="flex flex-col gap-5">
                <label className="font-heading text-base text-[#000000]">
                  Ethiopian Phone Number <span className="text-[#ff8442]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+251 9XX XXX XXX"
                  className="input-standard font-mono"
                />
              </div>

              <div className="flex flex-col gap-5">
                <label className="font-heading text-base text-[#000000]">
                  Your Message <span className="text-[#ff8442]">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can our barbers help you today?"
                  className="input-standard rounded-card resize-none p-15"
                />
              </div>

              {error && (
                <div className="text-xs text-red-900 font-bold bg-red-100 p-10 rounded-btn border-2 border-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary font-heading text-xl w-full mt-5"
                style={{ minHeight: 48 }}
              >
                Send Message →
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
