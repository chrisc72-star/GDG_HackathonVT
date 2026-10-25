/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This test file checks response-deadline calculations and deadline-state boundaries. It covers severity-specific timing and duration formatting.
 */

import { describe, expect, it } from "vitest";
import { computeDueAt, deadlineInfo, formatDuration } from "@/lib/deadlines";
import { JURISDICTION } from "@/lib/jurisdiction";

const DAY = 86_400_000;
const T0 = new Date("2026-03-01T12:00:00Z");

describe("computeDueAt", () => {
  it("adds the configured number of days for each severity", () => {
    for (const sev of ["emergency", "urgent", "standard", "minor"] as const) {
      const due = computeDueAt(T0, sev);
      expect(due.getTime() - T0.getTime()).toBe(JURISDICTION.responseDays[sev] * DAY);
    }
  });

  it("does not mutate the input date", () => {
    const copy = new Date(T0);
    computeDueAt(T0, "standard");
    expect(T0.getTime()).toBe(copy.getTime());
  });
});

describe("deadlineInfo", () => {
  const dueAt = computeDueAt(T0, "standard"); // 14 days

  it("is on_track early in the window", () => {
    const info = deadlineInfo({ reportedAt: T0, dueAt, resolvedAt: null }, new Date(T0.getTime() + 2 * DAY));
    expect(info.state).toBe("on_track");
    expect(info.label).toBe("Due in 12 days");
  });

  it("shows the full window right after creation (rounds remaining time up)", () => {
    const info = deadlineInfo({ reportedAt: T0, dueAt, resolvedAt: null }, new Date(T0.getTime() + 1000));
    expect(info.label).toBe("Due in 14 days");
  });

  it("is due_soon in the last quarter of the window", () => {
    const info = deadlineInfo({ reportedAt: T0, dueAt, resolvedAt: null }, new Date(T0.getTime() + 12 * DAY));
    expect(info.state).toBe("due_soon");
  });

  it("is due_soon (not overdue) at exactly the due time", () => {
    const info = deadlineInfo({ reportedAt: T0, dueAt, resolvedAt: null }, dueAt);
    expect(info.state).toBe("due_soon");
    expect(info.label).toBe("Due now");
  });

  it("is overdue one millisecond after the due time", () => {
    const info = deadlineInfo({ reportedAt: T0, dueAt, resolvedAt: null }, new Date(dueAt.getTime() + 1));
    expect(info.state).toBe("overdue");
  });

  it("reports how long overdue", () => {
    const info = deadlineInfo({ reportedAt: T0, dueAt, resolvedAt: null }, new Date(dueAt.getTime() + 3 * DAY));
    expect(info.label).toBe("Overdue by 3 days");
    expect(info.msRemaining).toBeLessThan(0);
  });

  it("resolved wins over overdue and reports days taken", () => {
    const resolvedAt = new Date(T0.getTime() + 20 * DAY);
    const info = deadlineInfo({ reportedAt: T0, dueAt, resolvedAt }, new Date(T0.getTime() + 40 * DAY));
    expect(info.state).toBe("resolved");
    expect(info.label).toBe("Resolved after 20 days");
  });

  it("uses singular wording for one day", () => {
    const resolvedAt = new Date(T0.getTime() + DAY);
    const info = deadlineInfo({ reportedAt: T0, dueAt, resolvedAt }, resolvedAt);
    expect(info.label).toBe("Resolved after 1 day");
  });

  it("handles the 1-day emergency window", () => {
    const emergencyDue = computeDueAt(T0, "emergency");
    const soon = deadlineInfo({ reportedAt: T0, dueAt: emergencyDue, resolvedAt: null }, new Date(T0.getTime() + 20 * 3_600_000));
    expect(soon.state).toBe("due_soon");
    expect(soon.label).toBe("Due in 4 hours");
  });
});

describe("formatDuration", () => {
  it("formats minutes, hours, and days", () => {
    expect(formatDuration(10 * 60_000)).toBe("less than an hour");
    expect(formatDuration(3_600_000)).toBe("1 hour");
    expect(formatDuration(5 * 3_600_000)).toBe("5 hours");
    expect(formatDuration(DAY)).toBe("1 day");
    expect(formatDuration(-3 * DAY)).toBe("3 days");
  });
});
