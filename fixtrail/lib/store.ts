import { randomUUID } from "node:crypto";
import { DEMO_BUILDINGS, buildSeedReports } from "./seed";
import { createSupabaseStore } from "./supabaseStore";
import type { Building, NewBuilding, NewReport, Report } from "./types";

export interface Store {
  mode: "memory" | "supabase";
  listBuildings(): Promise<Building[]>;
  createBuilding(input: NewBuilding): Promise<Building>;
  getBuilding(id: string): Promise<Building | null>;
  /** Used only for aggregation. Callers must not expose individual rows. */
  listReportsForBuilding(buildingId: string): Promise<Report[]>;
  listReportsForReporter(reporterHash: string): Promise<Report[]>;
  getReport(id: string): Promise<Report | null>;
  createReport(input: NewReport): Promise<Report>;
  updateReport(
    id: string,
    patch: Partial<Pick<Report, "status" | "acknowledgedAt" | "resolvedAt">>,
  ): Promise<Report | null>;
  deleteReport(id: string): Promise<void>;
  deleteAllForReporter(reporterHash: string): Promise<number>;
  getPhoto(report: Report): Promise<{ bytes: Uint8Array; mime: string } | null>;
}

export function createMemoryStore(now: Date = new Date()): Store {
  const buildings = new Map<string, Building>(DEMO_BUILDINGS.map((b) => [b.id, b]));
  const reports = new Map<string, Report>(buildSeedReports(now).map((r) => [r.id, r]));
  const photos = new Map<string, { bytes: Uint8Array; mime: string }>();

  return {
    mode: "memory",
    async listBuildings() {
      return [...buildings.values()];
    },
    async createBuilding(input) {
      const building: Building = { id: randomUUID(), ...input, isDemo: false };
      buildings.set(building.id, building);
      return building;
    },
    async getBuilding(id) {
      return buildings.get(id) ?? null;
    },
    async listReportsForBuilding(buildingId) {
      return [...reports.values()].filter((r) => r.buildingId === buildingId);
    },
    async listReportsForReporter(hash) {
      return [...reports.values()]
        .filter((r) => r.reporterHash === hash)
        .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
    },
    async getReport(id) {
      return reports.get(id) ?? null;
    },
    async createReport(input) {
      const { photo, ...rest } = input;
      const report: Report = { ...rest, photoPath: photo ? `mem:${rest.id}` : null };
      reports.set(report.id, report);
      if (photo) photos.set(report.id, photo);
      return report;
    },
    async updateReport(id, patch) {
      const existing = reports.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...patch };
      reports.set(id, updated);
      return updated;
    },
    async deleteReport(id) {
      reports.delete(id);
      photos.delete(id);
    },
    async deleteAllForReporter(hash) {
      let n = 0;
      for (const r of [...reports.values()]) {
        if (r.reporterHash === hash) {
          reports.delete(r.id);
          photos.delete(r.id);
          n += 1;
        }
      }
      return n;
    },
    async getPhoto(report) {
      return photos.get(report.id) ?? null;
    },
  };
}

const globalForStore = globalThis as unknown as { __fixtrailStore?: Store };

export function getStore(): Store {
  if (!globalForStore.__fixtrailStore) {
    globalForStore.__fixtrailStore =
      process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createSupabaseStore(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
        : createMemoryStore();
  }
  return globalForStore.__fixtrailStore;
}

/** Remove only the fictional demo household rows, preserving user reports. */
export async function removeDemoSeedReports(): Promise<void> {
  const store = getStore();
  for (const building of DEMO_BUILDINGS) {
    const reports = await store.listReportsForBuilding(building.id);
    const demoReports = reports.filter((report) => report.reporterHash.startsWith("demo-household-"));
    await Promise.all(demoReports.map((report) => store.deleteReport(report.id)));
  }
}