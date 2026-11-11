"use client";

import React, { useState, useRef, useEffect } from "react";
import { CopyIcon, CheckmarkIcon } from "@/components/icons/Hugeicons";

interface PaymentCardProps {
  cbeAccount: string;
  cbeName: string;
  telebirrNumber: string;
  telebirrName: string;
}

export default function PaymentCard({
  cbeAccount,
  cbeName,
  telebirrNumber,
  telebirrName,
}: PaymentCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Floating animation
  useEffect(() => {
    if (typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const keyframes = [
        { transform: "translateY(0px)" },
        { transform: "translateY(-8px)" },
        { transform: "translateY(0px)" },
      ];
      const animation = cardRef.current?.animate(keyframes, {
        duration: 4000,
        iterations: Infinity,
        easing: "ease-in-out",
      });
      return () => animation?.cancel();
    }
  }, []);

  // Mouse tilt effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rotateX = ((e.clientY - centerY) / rect.height) * -6;
    const rotateY = ((e.clientX - centerX) / rect.width) * 6;
    setTilt({ x: Math.max(-6, Math.min(6, rotateX)), y: Math.max(-6, Math.min(6, rotateY)) });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Flip handler
  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
  };

  // Copy to clipboard
  const handleCopy = async (text: string, type: "cbe" | "telebirr", e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
      {/* Card Scene */}
      <div
        ref={cardRef}
        className="relative w-full aspect-[16/10] cursor-pointer"
        style={{ perspective: "1000px" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleFlip(e as any)}
        aria-label={isFlipped ? "TeleBirr card - click to flip to CBE" : "CBE card - click to flip to TeleBirr"}
      >
        {/* Card Shell */}
        <div
          className="relative w-full h-full transition-transform duration-100 ease-out"
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          }}
        >
          {/* Card Inner - Handles flip */}
          <div
            className="relative w-full h-full transition-transform duration-800 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* Front Face - CBE */}
            <div
              className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
            >
              <img
                src="/images/cbe-card.jpg"
                alt="Commercial Bank of Ethiopia Card"
                className="w-full h-full object-cover"
              />
              {/* CBE Account Number Overlay */}
              <div
                className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2"
                onClick={(e) => handleCopy(cbeAccount.replace(/\s+/g, ""), "cbe", e)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleCopy(cbeAccount.replace(/\s+/g, ""), "cbe", e as any)}
                aria-label={`Copy CBE account number: ${cbeAccount}`}
              >
                <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wider">
                  {cbeAccount}
                </span>
                {copiedText === "cbe" ? (
                  <CheckmarkIcon size={16} className="text-green-400 shrink-0" />
                ) : (
                  <CopyIcon size={16} className="text-white/80 shrink-0" />
                )}
              </div>
            </div>

            {/* Back Face - TeleBirr */}
            <div
              className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <img
                src="/images/telebirr-card.jpg"
                alt="TeleBirr Wallet Card"
                className="w-full h-full object-cover"
              />
              {/* TeleBirr Wallet Number Overlay */}
              <div
                className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2"
                onClick={(e) => handleCopy(telebirrNumber.replace(/\s+/g, ""), "telebirr", e)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleCopy(telebirrNumber.replace(/\s+/g, ""), "telebirr", e as any)}
                aria-label={`Copy TeleBirr wallet number: ${telebirrNumber}`}
              >
                <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wider">
                  {telebirrNumber}
                </span>
                {copiedText === "telebirr" ? (
                  <CheckmarkIcon size={16} className="text-green-400 shrink-0" />
                ) : (
                  <CopyIcon size={16} className="text-white/80 shrink-0" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {copiedText && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#0f0f14] text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-4"
          role="alert"
          aria-live="polite"
        >
          <CheckmarkIcon size={16} className="text-green-400" />
          <span>
            {copiedText === "cbe" ? `CBE account ${cbeAccount} copied!` : `TeleBirr ${telebirrNumber} copied!`}
          </span>
        </div>
      )}

      {/* Flip Button */}
      <button
        type="button"
        onClick={handleFlip}
        className="px-6 py-2.5 rounded-lg bg-[#5b4cff] hover:bg-[#4a3fe6] text-white font-semibold text-sm transition-colors shadow-sm"
      >
        {isFlipped ? "Return to CBE" : "Flip to TeleBirr"}
      </button>
    </div>
  );
}
