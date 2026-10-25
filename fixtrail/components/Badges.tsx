/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This file defines reusable badges for deadlines, severity, and report status. It maps report values to consistent labels and visual states.
 */

import type { DeadlineInfo } from "@/lib/deadlines";
import { SEVERITY_LABELS, type ReportStatus, type Severity } from "@/lib/types";

/** Every badge has an icon AND text, so color is never the only signal. */

export function DeadlineBadge({ info }: { info: DeadlineInfo }) {
  const map = {
    resolved: { cls: "ok", icon: "✔" },
    on_track: { cls: "info", icon: "●" },
    due_soon: { cls: "warn", icon: "⏳" },
    overdue: { cls: "bad", icon: "⚠" },
  } as const;
  const { cls, icon } = map[info.state];
  return (
    <span className={`badge ${cls}`}>
      <span aria-hidden="true">{icon}</span>
      {info.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const cls =
    severity === "emergency" ? "bad" : severity === "urgent" ? "warn" : severity === "standard" ? "info" : "info";
  const icon = severity === "emergency" ? "‼" : severity === "urgent" ? "!" : "·";
  return (
    <span className={`badge ${cls}`}>
      <span aria-hidden="true">{icon}</span>
      {SEVERITY_LABELS[severity]} priority
    </span>
  );
}

const STATUS_LABELS: Record<ReportStatus, string> = {
  open: "Open",
  acknowledged: "Landlord acknowledged",
  resolved: "Resolved",
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  const cls = status === "resolved" ? "ok" : status === "acknowledged" ? "info" : "warn";
  return <span className={`badge ${cls}`}>{STATUS_LABELS[status]}</span>;
}
