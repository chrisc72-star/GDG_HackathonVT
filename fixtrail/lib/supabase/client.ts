/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This module creates the browser-side Supabase client using public environment settings. It is used for resident sign-in and client authentication state.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase browser environment variables are missing.");
  return createBrowserClient(url, key);
}
