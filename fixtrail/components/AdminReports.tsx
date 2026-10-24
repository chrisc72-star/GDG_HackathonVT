"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await api<{ reports: AdminReport[] }>("/api/admin/reports");
      setReports(result.reports);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load reports.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, action: "acknowledge" | "resolve" | "reopen") {
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      await api(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
      setMessage("Report updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the report.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this report and its photo? This cannot be undone.")) return;
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      await api(`/api/admin/reports/${id}`, { method: "DELETE" });
      await load();
      setMessage("Report deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the report.");
    } finally {
      setBusyId(null);
    }
  }

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
      <div aria-live="polite" role="status" className="meta" style={{ minHeight: "1.5rem" }}>{message}</div>
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
              <div className="actions">
                {report.status === "open" && (
                  <button className="btn small secondary" onClick={() => act(report.id, "acknowledge")} disabled={busyId === report.id}>
                    Mark acknowledged
                  </button>
                )}
                {report.status !== "resolved" && (
                  <button className="btn small secondary" onClick={() => act(report.id, "resolve")} disabled={busyId === report.id}>
                    Mark resolved
                  </button>
                )}
                {report.status === "resolved" && (
                  <button className="btn small secondary" onClick={() => act(report.id, "reopen")} disabled={busyId === report.id}>
                    Reopen
                  </button>
                )}
                <button className="btn small danger" onClick={() => remove(report.id)} disabled={busyId === report.id}>
                  Delete report
                </button>
              </div>
            </article>
          ))}
        </>
      )}
    </>
  );
}
