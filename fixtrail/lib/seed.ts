import { computeDueAt } from "./deadlines";
import type { Building, Category, Report, Severity } from "./types";

/** Fictional demo data. Clearly labeled as demo in the UI. */
export const DEMO_BUILDINGS: Building[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Maple Ridge Apartments (demo)",
    addressLine: "100 Example Street",
    city: "Demo City",
    state: "VA",
    isDemo: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Pine Court Townhomes (demo)",
    addressLine: "200 Sample Avenue",
    city: "Demo City",
    state: "VA",
    isDemo: true,
  },
];

const DAY = 86_400_000;

interface SeedRow {
  building: 0 | 1;
  household: string;
  category: Category;
  severity: Severity;
  daysAgo: number;
  /** days after reportedAt that the issue was acknowledged / resolved */
  ackAfter?: number;
  resolvedAfter?: number;
}

const ROWS: SeedRow[] = [
  // Pattern: four households with open mold reports.
  { building: 0, household: "h1", category: "mold", severity: "standard", daysAgo: 20 },
  { building: 0, household: "h2", category: "mold", severity: "standard", daysAgo: 12, ackAfter: 3 },
  { building: 0, household: "h3", category: "mold", severity: "standard", daysAgo: 9 },
  { building: 0, household: "h4", category: "mold", severity: "standard", daysAgo: 4 },
  // Water leaks: one overdue urgent, one on track.
  { building: 0, household: "h5", category: "water_leak", severity: "urgent", daysAgo: 5 },
  { building: 0, household: "h2", category: "water_leak", severity: "standard", daysAgo: 3 },
  // Resolved examples (give the dashboard a response-time median).
  { building: 0, household: "h6", category: "heating_cooling", severity: "standard", daysAgo: 30, ackAfter: 1, resolvedAfter: 5 },
  { building: 0, household: "h3", category: "heating_cooling", severity: "standard", daysAgo: 25, ackAfter: 2, resolvedAfter: 9 },
  { building: 0, household: "h1", category: "lock_security", severity: "urgent", daysAgo: 18, ackAfter: 1, resolvedAfter: 2 },
  // Other open items.
  { building: 0, household: "h5", category: "pests", severity: "standard", daysAgo: 6 },
  { building: 0, household: "h4", category: "electrical", severity: "urgent", daysAgo: 2, ackAfter: 1 },
  // Second building: too few households, so the dashboard must suppress details.
  { building: 1, household: "h7", category: "plumbing", severity: "standard", daysAgo: 4 },
  { building: 1, household: "h8", category: "mold", severity: "standard", daysAgo: 2 },
];

export function buildSeedReports(now: Date): Report[] {
  return ROWS.map((row, i) => {
    const reportedAt = new Date(now.getTime() - row.daysAgo * DAY);
    const acknowledgedAt =
      row.ackAfter !== undefined ? new Date(reportedAt.getTime() + row.ackAfter * DAY) : null;
    const resolvedAt =
      row.resolvedAfter !== undefined
        ? new Date(reportedAt.getTime() + row.resolvedAfter * DAY)
        : null;
    return {
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      buildingId: DEMO_BUILDINGS[row.building].id,
      reporterHash: `demo-household-${row.household}`,
      unitLabel: "",
      description: "",
      category: row.category,
      severity: row.severity,
      aiCategory: row.category,
      aiSeverity: row.severity,
      aiConfidence: 0.85,
      visibleEvidence: "Demo data.",
      flags: [],
      tenantEdited: false,
      aiProvider: "demo",
      aiModel: "demo",
      status: resolvedAt ? "resolved" : acknowledgedAt ? "acknowledged" : "open",
      reportedAt,
      dueAt: computeDueAt(reportedAt, row.severity),
      acknowledgedAt,
      resolvedAt,
      photoPath: null,
    } satisfies Report;
  });
}
