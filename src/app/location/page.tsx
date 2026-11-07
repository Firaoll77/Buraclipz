import Link from "next/link";

export const metadata = {
  title: "Location & Directions | Buraclipz Addis Ababa",
  description:
    "Find Buraclipz in Bole Medhanialem, Cameroon Street, Addis Ababa. View directions, transport access, and map.",
};

export default function LocationPage() {
  return (
    <main className="flex-1 flex flex-col gap-30 pb-40">
      {/* Title Banner */}
      <div className="card-light p-28 sm:p-40 flex flex-col gap-12 bg-[#faf5ea] border-2 border-[#141414]">
        <div className="flex items-center gap-10">
          <span className="badge-accent">Addis Ababa</span>
          <span className="badge-purple">Bole Sub-City</span>
        </div>
        <h1 className="font-heading text-4xl sm:text-6xl text-[#000000] tracking-tight uppercase">
          Location &amp; Directions
        </h1>
        <p className="text-sm sm:text-base text-[#666666] max-w-2xl leading-relaxed font-medium">
          Located on Cameroon Street in Bole Medhanialem, directly opposite Medhanialem Cathedral and adjacent to Morning Star Mall.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
        {/* Left Column: Address & Transport */}
        <div className="flex flex-col gap-20">
          {/* Main Address Card */}
          <div className="card-light p-28 flex flex-col gap-15 border-2 border-[#141414]">
            <h2 className="font-heading text-2xl text-[#000000] border-b-2 border-[#141414] pb-10">
              Shop Address &amp; Contact
            </h2>
            <div className="text-sm text-[#000000] space-y-5 font-medium">
              <p className="font-heading text-xl text-[#000000]">Buraclipz</p>
              <p>Cameroon Street, Bole Sub-City, Woreda 03</p>
              <p>Morning Star Mall Area (opposite Medhanialem Cathedral)</p>
              <p>Addis Ababa, Ethiopia</p>
            </div>
            <div className="pt-10 border-t border-[#141414]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-10">
              <span className="text-xs text-[#666666] font-bold uppercase tracking-wider">Direct Telephone:</span>
              <a
                href="tel:+251911223344"
                className="btn-primary text-xs font-mono font-bold px-15 py-6"
                style={{ minHeight: 38 }}
              >
                📞 +251 911 223 344
              </a>
            </div>
          </div>

          {/* Transport Card */}
          <div className="card-dark p-28 flex flex-col gap-15 border-2 border-[#141414]">
            <h2 className="font-heading text-2xl text-white border-b border-[#222222] pb-10">
              Transport &amp; Parking
            </h2>
            <div className="space-y-12 text-xs text-gray-300 leading-relaxed font-medium">
              <div className="p-12 rounded-card bg-[#141414] border border-[#262626]">
                <p className="font-heading text-base text-[#ff8442] mb-3">🚗 Ride-Hailing (RIDE, Feres, Yango)</p>
                <p>Set destination to &ldquo;Morning Star Mall, Bole&rdquo;. Our shop is located 50 meters south along Cameroon Street.</p>
              </div>
              <div className="p-12 rounded-card bg-[#141414] border border-[#262626]">
                <p className="font-heading text-base text-[#6040ff] mb-3">🚐 Minibus &amp; Public Taxi</p>
                <p>Take any Bole/Edna Mall taxi from Stadium or Megenagna. Drop off at Medhanialem Cathedral stop; walk 2 minutes towards Morning Star Mall.</p>
              </div>
              <div className="p-12 rounded-card bg-[#141414] border border-[#262626]">
                <p className="font-heading text-base text-[#ff8442] mb-3">🅿️ Customer Parking</p>
                <p>Surface parking available directly in front of the shop and secure underground parking at Morning Star Mall.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Google Maps Embed Card */}
        <div className="card-light p-28 flex flex-col gap-15 h-full border-2 border-[#141414]">
          <div className="flex items-center justify-between border-b-2 border-[#141414] pb-10">
            <h2 className="font-heading text-2xl text-[#000000]">Interactive Map</h2>
            <span className="badge-purple text-[10px]">Addis Ababa, ET</span>
          </div>

          <div className="w-full flex-1 min-h-[320px] lg:min-h-[440px] rounded-card overflow-hidden border-2 border-[#141414]">
            <iframe
              title="Buraclipz Location Addis Ababa"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 320 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3940.660144675549!2d38.7844089!3d8.9951804!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x164b84fd62947477%3A0xe54d9c7e3aa037a5!2sBole%20Medhanialem%20Church!5e0!3m2!1sen!2set!4v1710000000000!5m2!1sen!2set"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-10 pt-5 text-xs">
            <span className="text-[#666666] font-mono font-bold">GPS: 8.9952° N, 38.7844° E</span>
            <Link
              href="/#book"
              className="btn-primary text-xs uppercase tracking-wider font-extrabold px-20 py-8"
              style={{ minHeight: 40 }}
            >
              Book an Appointment
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
