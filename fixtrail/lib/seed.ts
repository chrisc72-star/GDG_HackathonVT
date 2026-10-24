import type { Building, Report } from "./types";

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

/** No fictional report rows are seeded; keep only reports submitted by users. */
export function buildSeedReports(_now: Date): Report[] {
  return [];
}
