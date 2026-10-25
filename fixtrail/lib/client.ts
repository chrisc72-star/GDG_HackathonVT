/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This module contains browser-side helpers for reporter identity, image compression, and API requests. It keeps uploaded photos smaller and attaches the appropriate device token to report operations.
 */

/** Browser-only helpers. Import these from client components only. */

const TOKEN_KEY = "fixtrail.reporterToken";

export function getReporterToken(): string {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID() + crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

/**
 * Downscale and re-encode as JPEG. This (1) strips EXIF metadata such as GPS
 * location, (2) keeps uploads small, and (3) cuts model token cost.
 */
export async function compressImage(file: File, maxDim = 1280, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image in this browser.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not compress the image."))),
      "image/jpeg",
      quality,
    );
  });
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("x-reporter-token", getReporterToken());
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* not JSON */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}
