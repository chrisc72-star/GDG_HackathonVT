/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This module converts stored reports into public, resident, and administrative response shapes. It controls which identity and status fields are exposed in each view.
 */

import { deadlineInfo, type DeadlineInfo } from "./deadlines";
import type { Report } from "./types";

/** What a tenant sees about their OWN report. Never includes the reporter hash. */
export interface ReportView {
  id: string;
  buildingId: string;
  tenantName: string;
  landlordName: string;
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

/** Fields intentionally visible to anyone viewing a building's public feed. */
export interface PublicReportView {
  id: string;
  buildingId: string;
  description: string;
  category: Report["category"];
  severity: Report["severity"];
  status: Report["status"];
  reportedAt: string;
  hasPhoto: boolean;
}

export function toPublicReportView(r: Report): PublicReportView {
  return {
    id: r.id,
    buildingId: r.buildingId,
    description: r.description,
    category: r.category,
    severity: r.severity,
    status: r.status,
    reportedAt: r.reportedAt.toISOString(),
    hasPhoto: r.photoPath !== null,
  };
}

export function toReportView(r: Report, now: Date): ReportView {
  return {
    id: r.id,
    buildingId: r.buildingId,
    tenantName: r.tenantName,
    landlordName: r.landlordName,
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
