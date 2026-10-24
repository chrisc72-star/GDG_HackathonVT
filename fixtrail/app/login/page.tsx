"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "vt-email") setError("FixTrail is currently limited to Virginia Tech @vt.edu accounts.");
    else if (params.get("error") === "link") setError("That sign-in link is invalid or expired. Request a new one.");
    else if (params.get("setup") === "missing") setError("Supabase Auth is not configured for this deployment yet.");
  }, []);

  async function requestLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSent(false);
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@vt\.edu$/.test(normalized)) {
      setError("Use your Virginia Tech email address ending in @vt.edu.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = new URL("/auth/callback?next=/onboarding", window.location.origin).toString();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
      });
      if (signInError) throw signInError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your sign-in link. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p><Link href="/">← FixTrail home</Link></p>
      <h1>Sign in with Virginia Tech</h1>
      <p className="lead">We’ll email a secure sign-in link to your verified @vt.edu address.</p>
      {error && <div className="notice bad" role="alert">{error}</div>}
      {sent && (
        <div className="notice" role="status">
          Check your Virginia Tech inbox and open the sign-in link in this browser. After you verify your email,
          you’ll choose your residence hall and add your name and room number.
        </div>
      )}
      <form className="card" onSubmit={requestLink} aria-busy={busy}>
        <div className="field">
          <label htmlFor="vt-email">Virginia Tech email</label>
          <input
            id="vt-email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@vt.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Sending link…" : "Email me a sign-in link"}
        </button>
      </form>
    </>
  );
}
