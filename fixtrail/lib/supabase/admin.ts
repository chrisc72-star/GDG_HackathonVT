/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This module creates the server-only Supabase service-role client. It keeps privileged database access out of browser code.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient<any> | null = null;

export function createSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server environment variables are missing.");
  adminClient ??= createClient(url, key, { auth: { persistSession: false } });
  return adminClient;
}
