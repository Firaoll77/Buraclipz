import type { Metadata, Viewport } from "next";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Buraclipz",
  description:
    "Own your style, embrace your power. Premium haircuts, beard grooming, and hot towel treatments in Bole Medhanialem, Addis Ababa, Ethiopia.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen text-[#0f0f14] antialiased selection:bg-[#5b4cff] selection:text-white flex flex-col justify-between">
        <div className="w-full max-w-[1440px] mx-auto flex-1 flex flex-col px-4 sm:px-6 lg:px-8 pt-6 pb-10">
          <div className="flex-1 flex flex-col">
            {children}
          </div>
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
