/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This module defines the demo and Virginia Tech residence-hall catalogs and builds sample reports. It supplies clearly marked development data without mixing demo households into real submissions.
 */

import type { Building, Report } from "./types";

/** Fictional demo buildings are never shown to Virginia Tech residents. */
export const DEMO_BUILDINGS: Building[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Maple Ridge Apartments (demo)",
    addressLine: "100 Example Street",
    city: "Demo City",
    state: "VA",
    isDemo: true,
    isVtCampus: false,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Pine Court Townhomes (demo)",
    addressLine: "200 Sample Avenue",
    city: "Demo City",
    state: "VA",
    isDemo: true,
    isVtCampus: false,
  },
];

/** Virginia Tech residence halls listed by VT Residential Experience. */
const VT_RESIDENCE_HALL_NAMES = [
  "Ambler Johnston (East)",
  "Ambler Johnston (West)",
  "Campbell (Main)",
  "Campbell (East)",
  "Cochrane",
  "The Creativity and Innovation District Residence Hall",
  "Eggleston (East)",
  "Eggleston (Main)",
  "Eggleston (West)",
  "Graduate Life Center at Donaldson Brown",
  "Harper",
  "Hillcrest",
  "Hoge Hall",
  "Johnson",
  "Miles",
  "New Hall West",
  "New Residence Hall East",
  "Newman",
  "O'Shaughnessy Hall",
  "Payne",
  "Pearson Hall East",
  "Pearson Hall West",
  "Peddrew-Yates",
  "Pritchard",
  "Slusher Hall",
  "Upper Quad Hall North",
  "Vawter",
  "Whitehurst Hall",
] as const;

export const VT_CAMPUS_BUILDINGS: Building[] = VT_RESIDENCE_HALL_NAMES.map((name, index) => ({
  id: `33333333-3333-4333-8333-${String(index + 1).padStart(12, "0")}`,
  name,
  addressLine: "Virginia Tech campus",
  city: "Blacksburg",
  state: "VA",
  isDemo: false,
  isVtCampus: true,
}));

/** No fictional report rows are seeded; keep only reports submitted by users. */
export function buildSeedReports(_now: Date): Report[] {
  return [];
}
