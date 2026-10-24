import { randomUUID } from "node:crypto";
import { computeDueAt } from "@/lib/deadlines";
import { clientIp, hashToken, json, validatePhoto } from "@/lib/http";
import { getCurrentResident } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { enforceSeverityFloor, MIN_CONFIDENCE, sanitizeText } from "@/lib/safety";
import { toReportView } from "@/lib/serialize";
import { getStore } from "@/lib/store";
import { CATEGORIES, CLASSIFIER_CATEGORIES, SEVERITIES, type Category, type ClassifierCategory, type Severity } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/** List the caller's own reports. */
export async function GET(req: Request) {
  void req;
  const resident = await getCurrentResident();
  if (!resident) return json({ error: "Please complete your Virginia Tech resident profile." }, 401);
  const hash = hashToken(resident.user.id);
  const now = new Date();
  const reports = await getStore().listReportsForReporter(hash);
  return json({ reports: reports.map((r) => toReportView(r, now)) });
}

/** Create a report (multipart: photo + fields). */
export async function POST(req: Request) {
  const resident = await getCurrentResident();
  if (!resident) return json({ error: "Please complete your Virginia Tech resident profile." }, 401);
  const hash = hashToken(resident.user.id);
  if (!rateLimit(`create:${clientIp(req)}`, 20, 60_000)) {
    return json({ error: "Too many requests. Please wait a minute and try again." }, 429);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Expected a form upload." }, 400);
  }

  if (form.get("publicConsent") !== "true") {
    return json({ error: "Please confirm that residents of your assigned building can view the photo and description." }, 400);
  }

  const photo = validatePhoto(form.get("photo"));
  if (!photo.ok) return json({ error: photo.error }, 400);

  const store = getStore();
  const buildingId = String(form.get("buildingId") ?? "");
  if (buildingId !== resident.profile.buildingId) {
    return json({ error: "You can submit reports only for your assigned residence hall." }, 403);
  }
  const building = await store.getBuilding(buildingId);
  if (!building) return json({ error: "Please choose a building." }, 400);

  const category = pick<Category>(form.get("category"), CATEGORIES);
  const requestedSeverity = pick<Severity>(form.get("severity"), SEVERITIES);
  if (!category || !requestedSeverity) {
    return json({ error: "Please choose a category and priority." }, 400);
  }

  // The floor is re-applied here so it cannot be bypassed from the client.
  const severity = enforceSeverityFloor(category, requestedSeverity);

  const aiCategory = pick<ClassifierCategory>(form.get("aiCategory"), CLASSIFIER_CATEGORIES);
  const aiSeverity = pick<Severity>(form.get("aiSeverity"), SEVERITIES);
  const confField = form.get("aiConfidence");
  const confRaw = typeof confField === "string" && confField.trim() !== "" ? Number(confField) : NaN;
  const aiConfidence = Number.isFinite(confRaw) ? Math.min(1, Math.max(0, confRaw)) : null;

  const flags: string[] = [];
  if (severity !== requestedSeverity) flags.push("severity_raised_by_rule");
  if (aiConfidence !== null && aiConfidence < MIN_CONFIDENCE) flags.push("low_confidence");
  const tenantEdited = !!aiCategory && (aiCategory !== category || aiSeverity !== requestedSeverity);
  if (tenantEdited) flags.push("tenant_edited");

  const now = new Date();
  const bytes = new Uint8Array(await photo.file.arrayBuffer());

  const landlordName = sanitizeText(String(form.get("landlordName") ?? ""), 80);
  if (!landlordName) return json({ error: "Please enter the landlord or manager name." }, 400);

  const created = await store.createReport({
    id: randomUUID(),
    buildingId,
    reporterHash: hash,
    tenantName: resident.profile.fullName,
    landlordName,
    unitLabel: resident.profile.roomNumber,
    description: sanitizeText(String(form.get("description") ?? ""), 500),
    isPublic: true,
    category,
    severity,
    aiCategory,
    aiSeverity,
    aiConfidence,
    visibleEvidence: sanitizeText(String(form.get("visibleEvidence") ?? ""), 300),
    flags,
    tenantEdited,
    aiProvider: sanitizeText(String(form.get("aiProvider") ?? ""), 40) || null,
    aiModel: sanitizeText(String(form.get("aiModel") ?? ""), 80) || null,
    status: "open",
    reportedAt: now,
    dueAt: computeDueAt(now, severity),
    acknowledgedAt: null,
    resolvedAt: null,
    photo: { bytes, mime: photo.file.type },
  });

  return json({ report: toReportView(created, now) }, 201);
}

/** Delete everything the caller has stored. */
export async function DELETE(req: Request) {
  void req;
  const resident = await getCurrentResident();
  if (!resident) return json({ error: "Please complete your Virginia Tech resident profile." }, 401);
  const hash = hashToken(resident.user.id);
  const deleted = await getStore().deleteAllForReporter(hash);
  return json({ deleted });
}
