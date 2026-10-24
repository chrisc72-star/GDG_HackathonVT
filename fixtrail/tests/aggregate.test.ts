import { describe, expect, it } from "vitest";
import { K_THRESHOLD, summarizeBuilding } from "@/lib/aggregate";
import { DEMO_BUILDINGS, buildSeedReports } from "@/lib/seed";

const NOW = new Date("2026-06-15T12:00:00Z");
const reports = buildSeedReports(NOW);
const forBuilding = (i: 0 | 1) => reports.filter((r) => r.buildingId === DEMO_BUILDINGS[i].id);

describe("summarizeBuilding", () => {
  it("detects the mold pattern across four households", () => {
    const s = summarizeBuilding(forBuilding(0), NOW);
    expect(s.insufficientData).toBe(false);
    const mold = s.patterns.find((p) => p.category === "mold");
    expect(mold).toBeDefined();
    expect(mold?.openCount).toBe(4);
    expect(mold?.households).toBe(4);
  });

  it("counts open, overdue, and resolved correctly", () => {
    const s = summarizeBuilding(forBuilding(0), NOW);
    expect(s.totalReports).toBe(11);
    expect(s.resolved).toBe(3);
    expect(s.open).toBe(8);
    // mold 20d old (14d window) and urgent leak 5d old (3d window) are overdue.
    expect(s.overdue).toBe(2);
  });

  it("computes the median days to resolve", () => {
    const s = summarizeBuilding(forBuilding(0), NOW);
    // Resolved after 5, 9, and 2 days -> median 5.
    expect(s.medianDaysToResolve).toBe(5);
  });

  it("suppresses everything when too few households reported", () => {
    const s = summarizeBuilding(forBuilding(1), NOW);
    expect(s.insufficientData).toBe(true);
    expect(s.byCategory).toEqual([]);
    expect(s.patterns).toEqual([]);
    expect(s.totalReports).toBe(0);
  });

  it("does not call it a pattern when one household files many reports", () => {
    const base = forBuilding(0).find((r) => r.category === "mold")!;
    const spam = Array.from({ length: 6 }, (_, i) => ({
      ...base,
      id: `x${i}`,
      reporterHash: "same-household",
      category: "pests" as const,
      resolvedAt: null,
    }));
    const others = forBuilding(0).filter((r) => r.category !== "pests");
    const s = summarizeBuilding([...others, ...spam], NOW);
    expect(s.patterns.find((p) => p.category === "pests")).toBeUndefined();
  });

  it("never includes identifying fields in its output", () => {
    const s = summarizeBuilding(forBuilding(0), NOW);
    const text = JSON.stringify(s);
    expect(text).not.toContain("demo-household");
    expect(text).not.toContain("reporterHash");
    expect(K_THRESHOLD).toBeGreaterThanOrEqual(3);
  });
});
