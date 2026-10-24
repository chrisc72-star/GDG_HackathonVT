"use client";

import { useEffect, useMemo, useState } from "react";
import { DeadlineBadge, SeverityBadge, StatusBadge } from "@/components/Badges";
import { api } from "@/lib/client";
import type { ReportView } from "@/lib/serialize";
import { CATEGORY_LABELS } from "@/lib/types";

interface AdminReport {
  report: ReportView;
  buildingName: string;
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export function AdminReports() {
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [query, setQuery] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ reports: AdminReport[] }>("/api/admin/reports")
      .then((result) => setReports(result.reports))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load reports."));
  }, []);

  const buildings = useMemo(() => {
    const unique = new Map<string, string>();
    for (const { report, buildingName } of reports ?? []) unique.set(report.buildingId, buildingName);
    return [...unique].sort((a, b) => a[1].localeCompare(b[1]));
  }, [reports]);

  const filtered = (reports ?? []).filter(({ report, buildingName }) => {
    if (buildingId && report.buildingId !== buildingId) return false;
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return true;
    return [report.tenantName, report.landlordName, buildingName]
      .some((value) => value.toLocaleLowerCase().includes(needle));
  });

  return (
    <>
      <h1>All reports</h1>
      <p className="lead">Administrator view of reports across all buildings. Resident names and room details are visible only to administrators.</p>
      {error && <div className="notice bad" role="alert">{error}</div>}
      {reports === null && !error && <p>Loading reports…</p>}

      {reports && (
        <>
          <section className="card" aria-label="Filter reports">
            <div className="grid cols-2">
              <div className="field">
                <label htmlFor="admin-report-search">Search resident, manager, or building name</label>
                <input id="admin-report-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="admin-report-building">Filter by building</label>
                <select id="admin-report-building" value={buildingId} onChange={(event) => setBuildingId(event.target.value)}>
                  <option value="">All buildings</option>
                  {buildings.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
            </div>
            <p className="meta" aria-live="polite">Showing {filtered.length} of {reports.length} reports.</p>
          </section>

          {filtered.length === 0 ? <div className="card"><p>No reports match those filters.</p></div> : filtered.map(({ report, buildingName }) => (
            <article key={report.id} className="card report">
              <h2>{CATEGORY_LABELS[report.category]} · {buildingName}</h2>
              <p className="meta">Resident: {report.tenantName} · Room {report.unitLabel} · Manager: {report.landlordName}</p>
              <p className="meta">Reported {fmt(report.reportedAt)} · Response requested by {fmt(report.dueAt)}</p>
              <div className="badges">
                <DeadlineBadge info={report.deadline} />
                <SeverityBadge severity={report.severity} />
                <StatusBadge status={report.status} />
              </div>
              {report.description && <p>{report.description}</p>}
              {report.hasPhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="preview" src={`/api/reports/${report.id}/photo`} alt={`Photo for report at ${buildingName}`} loading="lazy" />
              )}
            </article>
          ))}
        </>
      )}
    </>
  );
}
