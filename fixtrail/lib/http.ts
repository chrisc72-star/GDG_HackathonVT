import { createHash } from "node:crypto";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "local";
}

/** The raw device token lives only in the browser. The server stores its hash. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function reporterHashFrom(req: Request): string | null {
  const token = req.headers.get("x-reporter-token");
  if (!token || token.length < 20 || token.length > 200) return null;
  return hashToken(token);
}

export const MAX_PHOTO_BYTES = 3_000_000;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validatePhoto(file: unknown): { ok: true; file: File } | { ok: false; error: string } {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "A photo is required." };
  }
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return { ok: false, error: "Photo must be a JPEG, PNG, or WebP image." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Photo is too large (3 MB max)." };
  }
  return { ok: true, file };
}
