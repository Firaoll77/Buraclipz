import Link from "next/link";
import {
  PhoneIcon,
  CarIcon,
  BusIcon,
  LocationIcon,
} from "@/components/icons/Hugeicons";

export const metadata = {
  title: "Location & Directions | Buraclipz Addis Ababa",
  description:
    "Find Buraclipz at Ayat 49, Addis Ababa. View directions, transport access, and interactive map.",
};

export default function LocationPage() {
  return (
    <main className="flex-1 flex flex-col gap-30 pb-40">
      {/* Title Banner */}
      <div className="card-light p-28 sm:p-40 flex flex-col gap-12 bg-[#faf5ea] border-2 border-[#141414]">
        <div className="flex items-center gap-10">
          <span className="badge-accent">Addis Ababa</span>
          <span className="badge-purple">Ayat 49 &middot; Yeka</span>
        </div>
        <h1 className="font-heading text-4xl sm:text-6xl text-[#000000] tracking-tight uppercase">
          Location &amp; Directions
        </h1>
        <p className="text-sm sm:text-base text-[#666666] max-w-2xl leading-relaxed font-medium">
          Located at Ayat 49 in eastern Addis Ababa, easily accessible from Ayat Mazoriya, the Light Rail Transit terminal, and main transport routes.
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
              <p>Ayat 49, Yeka Sub-City</p>
              <p>Near Ayat Mazoriya &amp; LRT Terminal Area</p>
              <p>Addis Ababa, Ethiopia</p>
            </div>
            <div className="pt-10 border-t border-[#141414]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-10">
              <span className="text-xs text-[#666666] font-bold uppercase tracking-wider">Direct Telephone:</span>
              <a
                href="tel:+251911223344"
                className="btn-primary text-xs font-mono font-bold px-15 py-6 inline-flex items-center gap-1.5"
                style={{ minHeight: 38 }}
              >
                <PhoneIcon size={14} />
                <span>+251 911 223 344</span>
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
                <p className="font-heading text-base text-[#ff8442] mb-3 flex items-center gap-2">
                  <CarIcon size={18} />
                  <span>Ride-Hailing (RIDE, Feres, Yango)</span>
                </p>
                <p>Set destination to &ldquo;Ayat 49&rdquo; or &ldquo;Ayat Mazoriya&rdquo;. Our shop is located conveniently within Ayat 49.</p>
              </div>
              <div className="p-12 rounded-card bg-[#141414] border border-[#262626]">
                <p className="font-heading text-base text-[#6040ff] mb-3 flex items-center gap-2">
                  <BusIcon size={18} />
                  <span>Minibus &amp; Public Taxi</span>
                </p>
                <p>Take any Ayat, Tafo, or CMC taxi from Megenagna, Stadium, or Mexico. Drop off at the Ayat 49 / Ayat Mazoriya stop; walk 1 minute.</p>
              </div>
              <div className="p-12 rounded-card bg-[#141414] border border-[#262626]">
                <p className="font-heading text-base text-[#5b4cff] mb-3 flex items-center gap-2">
                  <LocationIcon size={18} />
                  <span>Light Rail (LRT) &amp; Parking</span>
                </p>
                <p>Take the East-West Light Rail to Ayat Terminal. Ample surface parking is available directly in front of the shop.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Google Maps Embed Card */}
        <div className="card-light p-28 flex flex-col gap-15 h-full border-2 border-[#141414]">
          <div className="flex items-center justify-between border-b-2 border-[#141414] pb-10">
            <h2 className="font-heading text-2xl text-[#000000]">Interactive Map</h2>
            <span className="badge-purple text-[10px]">Ayat 49, Addis Ababa</span>
          </div>

          <div className="w-full flex-1 min-h-[320px] lg:min-h-[440px] rounded-card overflow-hidden border-2 border-[#141414]">
            <iframe
              title="Buraclipz Location Ayat 49 Addis Ababa"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 320 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://maps.google.com/maps?q=Ayat+49,+Addis+Ababa,+Ethiopia&t=&z=15&ie=UTF8&iwloc=&output=embed"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-10 pt-5 text-xs">
            <span className="text-[#666666] font-mono font-bold">GPS: 9.0220° N, 38.8850° E</span>
            <div className="flex items-center gap-2">
              <a
                href="https://www.google.com/maps/search/?api=1&query=Ayat+49+Addis+Ababa"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs uppercase tracking-wider font-bold px-15 py-8"
                style={{ minHeight: 40 }}
              >
                Google Maps ↗
              </a>
              <Link
                href="/#book"
                className="btn-primary text-xs uppercase tracking-wider font-extrabold px-20 py-8"
                style={{ minHeight: 40 }}
              >
                Book Appointment
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
