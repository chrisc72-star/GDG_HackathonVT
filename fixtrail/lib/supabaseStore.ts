import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Store } from "./store";
import type { Building, Category, ClassifierCategory, NewBuilding, Report, ReportStatus, Severity } from "./types";

interface ReportRow {
  id: string;
  building_id: string;
  reporter_hash: string;
  unit_label: string;
  description: string;
  is_public: boolean;
  category: string;
  severity: string;
  ai_category: string | null;
  ai_severity: string | null;
  ai_confidence: number | null;
  visible_evidence: string;
  flags: string[];
  tenant_edited: boolean;
  ai_provider: string | null;
  ai_model: string | null;
  status: string;
  reported_at: string;
  due_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  photo_path: string | null;
}

interface BuildingRow {
  id: string;
  name: string;
  address_line: string;
  city: string;
  state: string;
  is_demo: boolean;
}

const toDate = (s: string | null): Date | null => (s ? new Date(s) : null);

export function rowToReport(r: ReportRow): Report {
  return {
    id: r.id,
    buildingId: r.building_id,
    reporterHash: r.reporter_hash,
    unitLabel: r.unit_label,
    description: r.description,
    isPublic: r.is_public,
    category: r.category as Category,
    severity: r.severity as Severity,
    aiCategory: r.ai_category as ClassifierCategory | null,
    aiSeverity: r.ai_severity as Severity | null,
    aiConfidence: r.ai_confidence,
    visibleEvidence: r.visible_evidence,
    flags: r.flags ?? [],
    tenantEdited: r.tenant_edited,
    aiProvider: r.ai_provider,
    aiModel: r.ai_model,
    status: r.status as ReportStatus,
    reportedAt: new Date(r.reported_at),
    dueAt: new Date(r.due_at),
    acknowledgedAt: toDate(r.acknowledged_at),
    resolvedAt: toDate(r.resolved_at),
    photoPath: r.photo_path,
  };
}

export function reportToRow(r: Report): ReportRow {
  return {
    id: r.id,
    building_id: r.buildingId,
    reporter_hash: r.reporterHash,
    unit_label: r.unitLabel,
    description: r.description,
    is_public: r.isPublic,
    category: r.category,
    severity: r.severity,
    ai_category: r.aiCategory,
    ai_severity: r.aiSeverity,
    ai_confidence: r.aiConfidence,
    visible_evidence: r.visibleEvidence,
    flags: r.flags,
    tenant_edited: r.tenantEdited,
    ai_provider: r.aiProvider,
    ai_model: r.aiModel,
    status: r.status,
    reported_at: r.reportedAt.toISOString(),
    due_at: r.dueAt.toISOString(),
    acknowledged_at: r.acknowledgedAt?.toISOString() ?? null,
    resolved_at: r.resolvedAt?.toISOString() ?? null,
    photo_path: r.photoPath,
  };
}

const rowToBuilding = (b: BuildingRow): Building => ({
  id: b.id,
  name: b.name,
  addressLine: b.address_line,
  city: b.city,
  state: b.state,
  isDemo: b.is_demo,
});

export function createSupabaseStore(url: string, serviceKey: string): Store {
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const bucket = process.env.SUPABASE_PHOTO_BUCKET || "report-photos";

  const must = <T>(res: { data: T | null; error: { message: string } | null }): T => {
    if (res.error) throw new Error(res.error.message);
    return res.data as T;
  };

  return {
    mode: "supabase",

    async listBuildings() {
      const rows = must(await db.from("buildings").select("*").order("name"));
      return (rows as BuildingRow[]).map(rowToBuilding);
    },

    async createBuilding(input: NewBuilding) {
      const row = must<BuildingRow>(
        await db
          .from("buildings")
          .insert({
            id: randomUUID(),
            name: input.name,
            address_line: input.addressLine,
            city: input.city,
            state: input.state,
            is_demo: false,
          })
          .select("*")
          .single(),
      );
      return rowToBuilding(row);
    },

    async getBuilding(id) {
      const row = must(await db.from("buildings").select("*").eq("id", id).maybeSingle());
      return row ? rowToBuilding(row as BuildingRow) : null;
    },

    async listReportsForBuilding(buildingId) {
      const rows = must(await db.from("reports").select("*").eq("building_id", buildingId));
      return (rows as ReportRow[]).map(rowToReport);
    },

    async listReportsForReporter(hash) {
      const rows = must(
        await db.from("reports").select("*").eq("reporter_hash", hash).order("reported_at", { ascending: false }),
      );
      return (rows as ReportRow[]).map(rowToReport);
    },

    async getReport(id) {
      const row = must(await db.from("reports").select("*").eq("id", id).maybeSingle());
      return row ? rowToReport(row as ReportRow) : null;
    },

    async createReport(input) {
      const { photo, ...rest } = input;
      let photoPath: string | null = null;
      if (photo) {
        photoPath = `${rest.reporterHash.slice(0, 12)}/${rest.id}.jpg`;
        const up = await db.storage.from(bucket).upload(photoPath, photo.bytes, {
          contentType: photo.mime,
          upsert: false,
        });
        if (up.error) throw new Error(up.error.message);
      }
      const report: Report = { ...rest, photoPath };
      must(await db.from("reports").insert(reportToRow(report)));
      return report;
    },

    async updateReport(id, patch) {
      const row: Partial<ReportRow> = {};
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.acknowledgedAt !== undefined) row.acknowledged_at = patch.acknowledgedAt?.toISOString() ?? null;
      if (patch.resolvedAt !== undefined) row.resolved_at = patch.resolvedAt?.toISOString() ?? null;
      const updated = must(
        await db.from("reports").update(row).eq("id", id).select("*").maybeSingle(),
      );
      return updated ? rowToReport(updated as ReportRow) : null;
    },

    async deleteReport(id) {
      const existing = await this.getReport(id);
      if (existing?.photoPath) await db.storage.from(bucket).remove([existing.photoPath]);
      must(await db.from("reports").delete().eq("id", id));
    },

    async deleteAllForReporter(hash) {
      const mine = await this.listReportsForReporter(hash);
      const paths = mine.map((r) => r.photoPath).filter((p): p is string => !!p);
      if (paths.length) await db.storage.from(bucket).remove(paths);
      must(await db.from("reports").delete().eq("reporter_hash", hash));
      return mine.length;
    },

    async getPhoto(report) {
      if (!report.photoPath) return null;
      const res = await db.storage.from(bucket).download(report.photoPath);
      if (res.error || !res.data) return null;
      const mime = ["image/jpeg", "image/png", "image/webp"].includes(res.data.type)
        ? res.data.type
        : "image/jpeg";
      return { bytes: new Uint8Array(await res.data.arrayBuffer()), mime };
    },
  };
}
