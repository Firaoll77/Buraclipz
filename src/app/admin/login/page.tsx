"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push(from);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-admin-root="true" className="min-h-screen flex items-center justify-center px-4" style={{ background: "#727272" }}>
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ background: "#ff9800" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M3 22v-2a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2" />
              <circle cx="12" cy="8" r="4" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white">Buraclipz Admin</h1>
          <p className="text-sm mt-1" style={{ color: "#d0d0d0" }}>Sign in to manage the shop</p>
        </div>

        {/* Login Card */}
        <div className="card-standard p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "#000" }}>
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-standard w-full"
                placeholder="Enter admin password"
                required
                autoComplete="current-password"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm font-medium" style={{ color: "#d32f2f" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="btn-pill w-full py-3 font-semibold text-white disabled:opacity-50"
              style={{ background: loading ? "#888" : "#ff9800" }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#bbb" }}>
          Buraclipz &middot; Addis Ababa, Ethiopia
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#727272" }} />}>
      <LoginForm />
    </Suspense>
  );
}

