import Link from "next/link";

export const metadata = {
  title: "Haircut Gallery | Buraclipz Addis Ababa",
  description:
    "Explore our authentic haircuts, fades, beard designs, and grooming work at Buraclipz in Addis Ababa.",
};

const GALLERY_ITEMS = [
  {
    title: "Low Skin Fade & Lineup",
    category: "Fades & Tapers",
    barber: "Dawit Tadesse",
    desc: "Seamless taper blend from zero with surgical razor edge contouring along the hairline and temple.",
    icon: "✂️",
    duration: "45 min",
  },
  {
    title: "Classic Gentleman Scissor Cut",
    category: "Classic Cuts",
    barber: "Dawit Tadesse",
    desc: "Hand-crafted scissor silhouette, side-part structure, with lightweight styling balm finish.",
    icon: "💈",
    duration: "40 min",
  },
  {
    title: "Beard Sculpting & Hot Towel Steam",
    category: "Beard Care",
    barber: "Yohannes Bekele",
    desc: "Essential oil mist, hot towel opening pores, precise cheek and neck straight-razor lines.",
    icon: "🧔",
    duration: "25 min",
  },
  {
    title: "High Drop Fade + Textured Top",
    category: "Fades & Tapers",
    barber: "Yohannes Bekele",
    desc: "Modern Addis urban style, clean contrast gradient, texture scissor work on crown.",
    icon: "✂️",
    duration: "45 min",
  },
  {
    title: "Traditional Head Massage & Wash",
    category: "Scalp Therapy",
    barber: "Abel Girma",
    desc: "Stimulating pressure-point scalp treatment, herbal shampoo, and invigorating eucalyptus rinse.",
    icon: "💆‍♂️",
    duration: "30 min",
  },
  {
    title: "Executive VIP Full Grooming",
    category: "VIP Packages",
    barber: "Abel Girma",
    desc: "Complete haircut, beard architecture, hot towel facial scrub, and shoulder-release massage.",
    icon: "👑",
    duration: "80 min",
  },
];

export default function GalleryPage() {
  return (
    <main className="flex-1 flex flex-col gap-30 pb-40">
      {/* Title Card */}
      <div className="card-light p-28 sm:p-40 flex flex-col gap-12 bg-[#faf5ea] border-2 border-[#141414]">
        <div className="flex items-center gap-10">
          <span className="badge-purple">Portfolio</span>
          <span className="badge-accent">Master Barbers</span>
        </div>
        <h1 className="font-heading text-4xl sm:text-6xl text-[#000000] tracking-tight uppercase">
          Craft &amp; Styling Gallery
        </h1>
        <p className="text-sm sm:text-base text-[#666666] max-w-2xl leading-relaxed font-medium">
          Signature cuts, clean gradients, and classic barbering craft from our Bole Medhanialem shop in Addis Ababa.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-20">
        {GALLERY_ITEMS.map((item) => (
          <div
            key={item.title}
            className="card-light flex flex-col justify-between gap-20 p-28 hover:shadow-[5px_6px_0px_#141414] transition-all"
          >
            <div className="flex flex-col gap-12">
              <div className="w-full h-120 rounded-card bg-[#faf5ea] border-2 border-[#141414] flex flex-col items-center justify-center gap-5 text-center p-10">
                <span className="text-3xl">{item.icon}</span>
                <span className="badge-purple text-[10px] py-0.5 px-8">
                  {item.category}
                </span>
              </div>

              <h2 className="font-heading text-2xl text-[#000000] leading-none pt-5">
                {item.title}
              </h2>
              <p className="text-xs text-[#666666] leading-relaxed font-medium">
                {item.desc}
              </p>
            </div>

            <div className="flex items-center justify-between pt-15 border-t border-[#141414]/15 text-xs">
              <span className="text-[#666666] font-medium">
                By: <strong className="text-[#000000]">{item.barber}</strong>
              </span>
              <Link
                href="/#book"
                className="btn-primary text-xs uppercase tracking-wider font-extrabold px-15 py-6"
                style={{ minHeight: 38 }}
              >
                Book →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Callout */}
      <div className="card-dark p-28 sm:p-35 flex flex-col sm:flex-row items-center justify-between gap-20 border-2 border-[#141414]">
        <div>
          <h3 className="font-heading text-2xl sm:text-3xl text-white">Have a specific haircut in mind?</h3>
          <p className="text-xs text-gray-400 mt-5 font-medium max-w-xl">
            Bring any photo or reference to your appointment—our master barbers will customize the look to match your head and face shape.
          </p>
        </div>
        <Link
          href="/#book"
          className="btn-primary text-sm uppercase tracking-wider font-extrabold px-30 py-12 whitespace-nowrap shadow-md shrink-0"
          style={{ minHeight: 48 }}
        >
          Book Your Chair
        </Link>
      </div>
    </main>
  );
}
