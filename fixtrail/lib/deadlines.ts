import { JURISDICTION } from "./jurisdiction";
import type { Severity } from "./types";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Plain date math. This is deliberately NOT done by the AI model. */
export function computeDueAt(reportedAt: Date, severity: Severity): Date {
  return new Date(reportedAt.getTime() + JURISDICTION.responseDays[severity] * DAY_MS);
}

export type DeadlineState = "resolved" | "on_track" | "due_soon" | "overdue";

export interface DeadlineInfo {
  state: DeadlineState;
  /** Positive = time left, negative = time past due. 0 when resolved. */
  msRemaining: number;
  label: string;
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/**
 * Round DOWN for time already elapsed ("overdue by 3 days" means a full 3 days
 * have passed) and UP for time remaining (a fresh 14-day window reads "14 days",
 * not "13 days" one second later).
 */
export function formatDuration(ms: number, round: "down" | "up" = "down"): string {
  const abs = Math.abs(ms);
  const fn = round === "up" ? Math.ceil : Math.floor;
  if (abs < HOUR_MS) return "less than an hour";
  if (abs < DAY_MS) return plural(fn(abs / HOUR_MS), "hour");
  return plural(fn(abs / DAY_MS), "day");
}

export function deadlineInfo(
  r: { reportedAt: Date; dueAt: Date; resolvedAt: Date | null },
  now: Date,
): DeadlineInfo {
  if (r.resolvedAt) {
    const days = (r.resolvedAt.getTime() - r.reportedAt.getTime()) / DAY_MS;
    const rounded = Math.max(0, Math.round(days * 10) / 10);
    return {
      state: "resolved",
      msRemaining: 0,
      label: `Resolved after ${rounded} ${rounded === 1 ? "day" : "days"}`,
    };
  }

  const remaining = r.dueAt.getTime() - now.getTime();
  const window = r.dueAt.getTime() - r.reportedAt.getTime();

  if (remaining < 0) {
    return {
      state: "overdue",
      msRemaining: remaining,
      label: `Overdue by ${formatDuration(remaining)}`,
    };
  }
  if (remaining <= window * 0.25) {
    return {
      state: "due_soon",
      msRemaining: remaining,
      label:
        remaining < HOUR_MS ? "Due now" : `Due in ${formatDuration(remaining, "up")}`,
    };
  }
  return {
    state: "on_track",
    msRemaining: remaining,
    label: `Due in ${formatDuration(remaining, "up")}`,
  };
}
