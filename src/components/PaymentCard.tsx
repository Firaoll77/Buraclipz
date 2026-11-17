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
              {/* CBE Account & Name Overlay */}
              <div
                className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 right-2.5 sm:right-3 flex items-center justify-between gap-2 bg-black/70 backdrop-blur-md rounded-xl px-3 py-2 border border-white/15 shadow-lg"
                onClick={(e) => handleCopy(cbeAccount.replace(/\s+/g, ""), "cbe", e)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleCopy(cbeAccount.replace(/\s+/g, ""), "cbe", e as any)}
                aria-label={`Copy CBE account number: ${cbeAccount} for ${cbeName}`}
              >
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-[10px] sm:text-xs font-semibold text-amber-300 uppercase tracking-wider truncate">
                    {cbeName}
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-white tracking-wider">
                    {cbeAccount}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors">
                  {copiedText === "cbe" ? (
                    <>
                      <CheckmarkIcon size={14} className="text-green-400" />
                      <span className="text-[11px] font-semibold text-green-400 hidden xs:inline">Copied</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon size={14} className="text-white/90" />
                      <span className="text-[11px] font-medium text-white/90 hidden xs:inline">Copy</span>
                    </>
                  )}
                </div>
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
              {/* TeleBirr Number & Name Overlay */}
              <div
                className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 right-2.5 sm:right-3 flex items-center justify-between gap-2 bg-black/70 backdrop-blur-md rounded-xl px-3 py-2 border border-white/15 shadow-lg"
                onClick={(e) => handleCopy(telebirrNumber.replace(/\s+/g, ""), "telebirr", e)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleCopy(telebirrNumber.replace(/\s+/g, ""), "telebirr", e as any)}
                aria-label={`Copy TeleBirr wallet number: ${telebirrNumber} for ${telebirrName}`}
              >
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-[10px] sm:text-xs font-semibold text-emerald-300 uppercase tracking-wider truncate">
                    {telebirrName}
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-white tracking-wider">
                    {telebirrNumber}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors">
                  {copiedText === "telebirr" ? (
                    <>
                      <CheckmarkIcon size={14} className="text-green-400" />
                      <span className="text-[11px] font-semibold text-green-400 hidden xs:inline">Copied</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon size={14} className="text-white/90" />
                      <span className="text-[11px] font-medium text-white/90 hidden xs:inline">Copy</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Account Info Card (Mobile-friendly direct display & copy) */}
      <div className="w-full bg-[#f8f8fa] border border-[#e5e5ea] rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-col min-w-0 text-left">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isFlipped ? "bg-[#00a651]" : "bg-[#800080]"
              }`}
            />
            <span className="text-[11px] text-[#666666] font-semibold uppercase tracking-wider">
              {isFlipped ? "Telebirr Wallet" : "CBE Bank Account"}
            </span>
          </div>
          <span className="text-sm font-bold text-[#0f0f14] truncate">
            {isFlipped ? telebirrName : cbeName}
          </span>
          <span className="font-mono text-xs text-[#444444] font-semibold tracking-wide">
            {isFlipped ? telebirrNumber : cbeAccount}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) =>
            handleCopy(
              isFlipped
                ? telebirrNumber.replace(/\s+/g, "")
                : cbeAccount.replace(/\s+/g, ""),
              isFlipped ? "telebirr" : "cbe",
              e
            )
          }
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#5b4cff] hover:bg-[#4a3fe6] text-white text-xs font-semibold transition-all active:scale-95 shadow-xs"
          aria-label={`Copy ${isFlipped ? "TeleBirr number" : "CBE account number"}`}
        >
          {copiedText === (isFlipped ? "telebirr" : "cbe") ? (
            <>
              <CheckmarkIcon size={14} className="text-white" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <CopyIcon size={14} className="text-white" />
              <span>Copy</span>
            </>
          )}
        </button>
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
            {copiedText === "cbe"
              ? `CBE account ${cbeAccount} (${cbeName}) copied!`
              : `TeleBirr ${telebirrNumber} (${telebirrName}) copied!`}
          </span>
        </div>
      )}

      {/* Flip Button & Hint */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        <button
          type="button"
          onClick={handleFlip}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#141414] hover:bg-[#2b2b2b] text-white font-semibold text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <span>🔄</span>
          <span>{isFlipped ? "Flip to CBE" : "Flip to TeleBirr"}</span>
        </button>
        <span className="text-[11px] text-[#888888]">
          Tap card or button to flip between CBE & Telebirr
        </span>
      </div>
    </div>
  );
}
