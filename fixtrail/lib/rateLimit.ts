import { createClient } from "@supabase/supabase-js";

/**
 * Tiny in-memory sliding-window limiter. Good enough for a demo; on serverless
 * hosting each instance keeps its own counters, so use a shared store for real
 * traffic.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function resetRateLimits(): void {
  hits.clear();
}

type RateLimitRpcClient = {
  rpc(
    name: string,
    args: { p_key: string; p_max_hits: number; p_window_seconds: number },
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

let sharedClient: RateLimitRpcClient | null = null;

/**
 * Enforce a rolling limit across serverless instances using Supabase when it
 * is configured. Local/demo mode uses the in-process map above.
 */
export async function consumeRateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return rateLimit(key, max, windowMs);

  sharedClient ??= createClient(url, serviceKey, { auth: { persistSession: false } }) as unknown as RateLimitRpcClient;
  const { data, error } = await sharedClient.rpc("consume_fixtrail_rate_limit", {
    p_key: key,
    p_max_hits: max,
    p_window_seconds: Math.ceil(windowMs / 1000),
  });
  if (error || typeof data !== "boolean") {
    throw new Error("Shared rate limit is unavailable.");
  }
  return data;
}
