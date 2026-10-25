/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This component shows the current sign-in state in the site navigation. It displays the signed-in email and sign-out control or a link to sign in.
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthControls() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const supabase = createSupabaseBrowserClient();
      supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setEmail(session?.user.email ?? null);
      });
      return () => listener.subscription.unsubscribe();
    } catch {
      setEmail(null);
    }
  }, []);

  async function signOut() {
    try {
      await createSupabaseBrowserClient().auth.signOut();
    } finally {
      window.location.assign("/login");
    }
  }

  return email ? (
    <span className="auth-controls">
      <span className="meta">{email}</span>
      <button className="btn small secondary" type="button" onClick={signOut}>Sign out</button>
    </span>
  ) : <Link href="/login">Sign in</Link>;
}
