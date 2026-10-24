import { classifyReport } from "@/lib/classify";
import { clientIp, json, validatePhoto } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { applySafetyRules, sanitizeText } from "@/lib/safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Analyze a photo. Nothing is stored: the photo is sent to the model, the
 * result is returned, and the tenant decides whether to submit a report.
 */
export async function POST(req: Request) {
  if (!rateLimit(`classify:${clientIp(req)}`, 12, 60_000)) {
    return json({ error: "Too many requests. Please wait a minute and try again." }, 429);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Expected a form upload." }, 400);
  }

  const photo = validatePhoto(form.get("photo"));
  if (!photo.ok) return json({ error: photo.error }, 400);

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
