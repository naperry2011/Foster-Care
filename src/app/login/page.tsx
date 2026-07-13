"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="min-h-screen bg-dusk flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <span className="w-2.5 h-2.5 rounded-full bg-porch shadow-[0_0_20px_4px_rgba(233,162,59,.5)]" />
          <span className="font-serif text-2xl font-semibold text-white">
            Porchlight
          </span>
        </div>
        {status === "sent" ? (
          <p className="text-center text-glow">
            Check your email — we sent you a sign-in link.
          </p>
        ) : (
          <form onSubmit={sendLink} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@agency.org"
              className="w-full rounded-full bg-white/10 border border-white/20 px-5 py-3 text-white placeholder-white/40 focus:outline-none focus:border-porch"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-full bg-porch text-night font-medium py-3 hover:brightness-105 disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Send sign-in link"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-300 text-center">{error}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
