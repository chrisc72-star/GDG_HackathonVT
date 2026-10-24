import {
  SEVERITY_RANK,
  type Category,
  type Classification,
  type Severity,
} from "./types";

/** Below this, the UI asks the tenant to confirm the category themselves. */
export const MIN_CONFIDENCE = 0.6;

/**
 * Rule-based safety floors. The model can never rate these categories lower
 * than the floor, no matter what it (or text inside a photo) says.
 */
export const SEVERITY_FLOOR: Partial<Record<Category, Severity>> = {
  gas_odor: "emergency",
  fire_safety: "urgent",
  sewage: "urgent",
  lock_security: "urgent",
};

export function enforceSeverityFloor(category: Category, severity: Severity): Severity {
  const floor = SEVERITY_FLOOR[category];
  if (!floor) return severity;
  return SEVERITY_RANK[severity] < SEVERITY_RANK[floor] ? floor : severity;
}

export const EMERGENCY_NOTICE =
  "If you smell gas, see fire or smoke, or feel unsafe, leave the area and call 911 or your gas utility's emergency line first. FixTrail is a record-keeping tool, not an emergency service.";

/** Strip control and invisible characters, collapse whitespace, cap length. */
export function sanitizeText(input: string, max: number): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export type SafeClassification = Omit<Classification, "category"> & {
  category: Category;
};

export type SafetyResult =
  | {
      ok: true;
      classification: SafeClassification;
      flags: string[];
      needsReview: boolean;
      emergencyNotice: string | null;
    }
  | { ok: false; rejectionReason: string; flags: string[] };

export function applySafetyRules(c: Classification): SafetyResult {
  const flags: string[] = [];

  if (c.category === "not_housing") {
    return {
      ok: false,
      rejectionReason:
        "This photo doesn't appear to show a housing repair issue. Try a clearer, closer photo of the problem.",
      flags: ["not_housing"],
    };
  }

  const evidence = sanitizeText(c.visibleEvidence, 300);
  const confidence = Math.min(1, Math.max(0, Number.isFinite(c.confidence) ? c.confidence : 0));

  let severity = c.severity;
  const floored = enforceSeverityFloor(c.category, severity);
  if (floored !== severity) {
    severity = floored;
    flags.push("severity_raised_by_rule");
  }

  const needsReview = confidence < MIN_CONFIDENCE;
  if (needsReview) flags.push("low_confidence");

  const emergencyNotice =
    c.category === "gas_odor" || c.category === "fire_safety" || severity === "emergency"
      ? EMERGENCY_NOTICE
      : null;

  return {
    ok: true,
    classification: {
      category: c.category,
      severity,
      confidence,
      visibleEvidence: evidence,
    },
    flags,
    needsReview,
    emergencyNotice,
  };
}
