import { describe, expect, it } from "vitest";
import { computeDueAt } from "@/lib/deadlines";
import { hashToken, reporterHashFrom, validatePhoto } from "@/lib/http";
import { rateLimit, resetRateLimits } from "@/lib/rateLimit";
import { DEMO_BUILDINGS } from "@/lib/seed";
import { createMemoryStore } from "@/lib/store";
import type { NewReport } from "@/lib/types";

const NOW = new Date("2026-06-15T12:00:00Z");

function newReport(id: string, hash: string): NewReport {
  return {
    id,
    buildingId: DEMO_BUILDINGS[0].id,
    reporterHash: hash,
    unitLabel: "4B",
    description: "Leak under sink",
    isPublic: true,
    category: "water_leak",
    severity: "standard",
    aiCategory: "water_leak",
    aiSeverity: "standard",
    aiConfidence: 0.9,
    visibleEvidence: "Water under a sink.",
    flags: [],
    tenantEdited: false,
    aiProvider: "mock",
    aiModel: "keyword-mock",
    status: "open",
    reportedAt: NOW,
    dueAt: computeDueAt(NOW, "standard"),
    acknowledgedAt: null,
    resolvedAt: null,
    photo: { bytes: new Uint8Array([1, 2, 3]), mime: "image/jpeg" },
  };
}

describe("memory store", () => {
  it("creates, lists, updates, and deletes a report", async () => {
    const store = createMemoryStore(NOW);
    const created = await store.createReport(newReport("r1", "hash-a"));
    expect(created.photoPath).toBe("mem:r1");

    const mine = await store.listReportsForReporter("hash-a");
    expect(mine.map((r) => r.id)).toEqual(["r1"]);
    expect((await store.getPhoto(created))?.bytes.length).toBe(3);

    const ack = await store.updateReport("r1", { status: "acknowledged", acknowledgedAt: NOW });
    expect(ack?.status).toBe("acknowledged");

    await store.deleteReport("r1");
    expect(await store.getReport("r1")).toBeNull();
    expect(await store.getPhoto(created)).toBeNull();
  });

  it("only returns a reporter's own reports", async () => {
    const store = createMemoryStore(NOW);
    await store.createReport(newReport("a1", "hash-a"));
    await store.createReport(newReport("b1", "hash-b"));
    expect((await store.listReportsForReporter("hash-a")).map((r) => r.id)).toEqual(["a1"]);
  });

  it("deleteAllForReporter removes only that reporter's data", async () => {
    const store = createMemoryStore(NOW);
    await store.createReport(newReport("a1", "hash-a"));
    await store.createReport(newReport("a2", "hash-a"));
    await store.createReport(newReport("b1", "hash-b"));
    expect(await store.deleteAllForReporter("hash-a")).toBe(2);
    expect(await store.listReportsForReporter("hash-a")).toEqual([]);
    expect(await store.getReport("b1")).not.toBeNull();
  });

  it("starts with demo buildings and seeded reports", async () => {
    const store = createMemoryStore(NOW);
    expect((await store.listBuildings()).length).toBe(2);
    expect((await store.listReportsForBuilding(DEMO_BUILDINGS[0].id)).length).toBe(11);
  });
});

describe("http helpers", () => {
  it("hashes tokens deterministically and never returns the raw token", () => {
    const token = "a".repeat(40);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).toHaveLength(64);
  });

  it("rejects missing or short tokens", () => {
    const req = (t?: string) => new Request("http://x", { headers: t ? { "x-reporter-token": t } : {} });
    expect(reporterHashFrom(req())).toBeNull();
    expect(reporterHashFrom(req("short"))).toBeNull();
    expect(reporterHashFrom(req("x".repeat(30)))).not.toBeNull();
  });

  it("validates photo type and size", () => {
    expect(validatePhoto(null).ok).toBe(false);
    expect(validatePhoto(new File([new Uint8Array(10)], "a.gif", { type: "image/gif" })).ok).toBe(false);
    expect(validatePhoto(new File([new Uint8Array(4_000_000)], "a.jpg", { type: "image/jpeg" })).ok).toBe(false);
    expect(validatePhoto(new File([new Uint8Array(100)], "a.jpg", { type: "image/jpeg" })).ok).toBe(true);
  });
});

describe("rateLimit", () => {
  it("blocks after the limit and recovers after the window", () => {
    resetRateLimits();
    expect(rateLimit("k", 2, 1000, 0)).toBe(true);
    expect(rateLimit("k", 2, 1000, 10)).toBe(true);
    expect(rateLimit("k", 2, 1000, 20)).toBe(false);
    expect(rateLimit("k", 2, 1000, 1500)).toBe(true);
  });
});
