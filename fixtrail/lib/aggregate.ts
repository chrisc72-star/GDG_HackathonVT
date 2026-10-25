/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This module builds privacy-preserving building summaries from tenant reports. It applies household thresholds and computes category, severity, and response-time patterns.
 */

import { deadlineInfo } from "./deadlines";
import type { Category, Report } from "./types";

/**
 * Building-level summaries for the public dashboard.
 *
 * Privacy rule (k-anonymity style): nothing is broken down unless at least K
 * different households have reported for that building. A "pattern" needs at
 * least K open reports in one category from at least K different households.
 * Unit numbers, descriptions, and photos are never part of this output.
 */
export const K_THRESHOLD = 3;

export type SummaryInput = Pick<
  Report,
  "reporterHash" | "category" | "reportedAt" | "dueAt" | "resolvedAt"
>;

export interface CategoryRow {
  category: Category;
  open: number;
  total: number;
}

export interface Pattern {
  category: Category;
  openCount: number;
  households: number;
}

export interface BuildingSummary {
  /** True when too few households have reported to show any breakdown. */
  insufficientData: boolean;
  totalReports: number;
  open: number;
  overdue: number;
  resolved: number;
  medianDaysToResolve: number | null;
  byCategory: CategoryRow[];
  patterns: Pattern[];
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const m = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(m * 10) / 10;
}

export function summarizeBuilding(
  reports: SummaryInput[],
  now: Date,
  k: number = K_THRESHOLD,
): BuildingSummary {
  const households = new Set(reports.map((r) => r.reporterHash));

  if (households.size < k) {
    return {
      insufficientData: true,
      totalReports: 0,
      open: 0,
      overdue: 0,
      resolved: 0,
      medianDaysToResolve: null,
      byCategory: [],
      patterns: [],
    };
  }

  const open = reports.filter((r) => !r.resolvedAt);
  const resolved = reports.filter((r) => r.resolvedAt);
  const overdue = open.filter((r) => deadlineInfo(r, now).state === "overdue");

  const DAY_MS = 86_400_000;
  const resolveDays = resolved.map(
    (r) => ((r.resolvedAt as Date).getTime() - r.reportedAt.getTime()) / DAY_MS,
  );

  const cats = new Map<Category, { open: SummaryInput[]; total: number }>();
  for (const r of reports) {
    const entry = cats.get(r.category) ?? { open: [], total: 0 };
    entry.total += 1;
    if (!r.resolvedAt) entry.open.push(r);
    cats.set(r.category, entry);
  }

  const byCategory: CategoryRow[] = [...cats.entries()]
    .map(([category, v]) => ({ category, open: v.open.length, total: v.total }))
    .sort((a, b) => b.open - a.open || b.total - a.total);

  const patterns: Pattern[] = [...cats.entries()]
    .map(([category, v]) => ({
      category,
      openCount: v.open.length,
      households: new Set(v.open.map((r) => r.reporterHash)).size,
    }))
    .filter((p) => p.openCount >= k && p.households >= k)
    .sort((a, b) => b.openCount - a.openCount);

  return {
    insufficientData: false,
    totalReports: reports.length,
    open: open.length,
    overdue: overdue.length,
    resolved: resolved.length,
    medianDaysToResolve: median(resolveDays),
    byCategory,
    patterns,
  };
}
