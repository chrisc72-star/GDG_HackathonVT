/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This API route analyzes an uploaded housing-issue photo and optional note without saving the submission. It validates the input, applies rate limits and safety rules, and returns the suggested classification.
 */

import { classifyReport } from "@/lib/classify";
import { clientIp, hashToken, json, reporterHashFrom, validatePhoto } from "@/lib/http";
import { consumeRateLimit } from "@/lib/rateLimit";
import { applySafetyRules, sanitizeText } from "@/lib/safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Analyze a photo. Nothing is stored: the photo is sent to the model, the
 * result is returned, and the tenant decides whether to submit a report.
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Expected a form upload." }, 400);
  }

  const photo = validatePhoto(form.get("photo"));
  if (!photo.ok) return json({ error: photo.error }, 400);

  const deviceHash = reporterHashFrom(req) ?? hashToken(`ip:${clientIp(req)}`);
  let allowed: boolean;
  try {
    allowed = await consumeRateLimit(`analyze:${deviceHash}`, 2, 5 * 60_000);
  } catch {
    return json({ error: "Photo analysis is temporarily unavailable. Please try again shortly." }, 503);
  }
  if (!allowed) {
    return json({ error: "Analysis limit reached. This device can analyze 2 photos every 5 minutes." }, 429);
  }

  const description = sanitizeText(String(form.get("description") ?? ""), 500);
  const bytes = Buffer.from(await photo.file.arrayBuffer());

  const result = await classifyReport({
    imageBase64: bytes.toString("base64"),
    mimeType: photo.file.type,
    description,
  });

  const safety = applySafetyRules(result.classification);
  const meta = { provider: result.provider, model: result.model, usage: result.usage ?? null };

  if (!safety.ok) {
    return json({ rejected: safety.rejectionReason, flags: safety.flags, ...meta });
  }

  return json({
    classification: safety.classification,
    flags: safety.flags,
    needsReview: safety.needsReview,
    emergencyNotice: safety.emergencyNotice,
    ...meta,
  });
}
