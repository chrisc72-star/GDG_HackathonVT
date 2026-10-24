"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "vt-email") {
      setError("FixTrail is limited to verified Virginia Tech @vt.edu accounts. Choose your VT Google account and try again.");
    } else if (params.get("error") === "oauth" || params.get("error") === "link") {
      setError("Google sign-in did not complete. Please try again and choose your Virginia Tech account.");
    } else if (params.get("setup") === "missing") {
      setError("Supabase Auth is not configured for this deployment yet.");
    }
  }, []);

  async function signInWithGoogle() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/onboarding";
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", next);
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callback.toString(),
          // This asks Google to show VT accounts first; the server still enforces @vt.edu.
          queryParams: { hd: "vt.edu", prompt: "select_account" },
        },
      });
      if (signInError) throw signInError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Google sign-in. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <p><Link href="/">← FixTrail home</Link></p>
      <h1>Sign in with Virginia Tech</h1>
      <p className="lead">Continue with your VT Google account ending in @vt.edu. We use your verified email to limit access to Virginia Tech residents.</p>
      {error && <div className="notice bad" role="alert">{error}</div>}
      <div className="card" aria-busy={busy}>
        <button className="btn" type="button" onClick={signInWithGoogle} disabled={busy}>
          {busy ? "Connecting to Google…" : "Continue with Google"}
        </button>
      </div>
    </>
  );
}
