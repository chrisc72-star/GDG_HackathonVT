/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This module records the application’s jurisdiction and related legal-context metadata. It gives report-notice generation a single source for location-specific wording.
 */

import type { Severity } from "./types";

/**
 * Jurisdiction settings. Keep ALL legal-ish text and timing here so it can be
 * reviewed and corrected in one place.
 *
 * IMPORTANT: `responseDays` are APP DEFAULTS for the response time a tenant
 * REQUESTS in a repair notice. They are not statutory deadlines. Before you
 * submit or deploy, have someone check the citations below against the current
 * Virginia Code and your own lease, then set `verified` to true.
 */
export interface Jurisdiction {
  name: string;
  responseDays: Record<Severity, number>;
  /** Cited in the notice letter. */
  letterCitation: string;
  /** Not used in the letter until someone verifies them. */
  needsVerification: string[];
  verified: boolean;
}

export const JURISDICTION: Jurisdiction = {
  name: "Virginia",
  responseDays: { emergency: 1, urgent: 3, standard: 14, minor: 30 },
  letterCitation:
    "Virginia Residential Landlord and Tenant Act, Va. Code § 55.1-1200 et seq.",
  needsVerification: [
    "Va. Code § 55.1-1220 (landlord maintenance obligations)",
    "Va. Code § 55.1-1244 (tenant remedies after written notice)",
  ],
  verified: false,
};
