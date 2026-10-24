import { deadlineInfo, type DeadlineInfo } from "./deadlines";
import type { Report } from "./types";

/** What a tenant sees about their OWN report. Never includes the reporter hash. */
export interface ReportView {
  id: string;
  buildingId: string;
  unitLabel: string;
  description: string;
  category: Report["category"];
  severity: Report["severity"];
  aiCategory: Report["aiCategory"];
  aiSeverity: Report["aiSeverity"];
  aiConfidence: number | null;
  visibleEvidence: string;
  flags: string[];
  tenantEdited: boolean;
  status: Report["status"];
  reportedAt: string;
  dueAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  hasPhoto: boolean;
  deadline: DeadlineInfo;
}

export function toReportView(r: Report, now: Date): ReportView {
  return {
    id: r.id,
    buildingId: r.buildingId,
    unitLabel: r.unitLabel,
    description: r.description,
    category: r.category,
    severity: r.severity,
    aiCategory: r.aiCategory,
    aiSeverity: r.aiSeverity,
    aiConfidence: r.aiConfidence,
    visibleEvidence: r.visibleEvidence,
    flags: r.flags,
    tenantEdited: r.tenantEdited,
    status: r.status,
    reportedAt: r.reportedAt.toISOString(),
    dueAt: r.dueAt.toISOString(),
    acknowledgedAt: r.acknowledgedAt?.toISOString() ?? null,
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    hasPhoto: r.photoPath !== null,
    deadline: deadlineInfo(r, now),
  };
}
