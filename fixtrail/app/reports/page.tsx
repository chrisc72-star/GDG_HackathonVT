"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DeadlineBadge, SeverityBadge, StatusBadge } from "@/components/Badges";
import { api, getReporterToken } from "@/lib/client";
import type { ReportView } from "@/lib/serialize";
import { CATEGORY_LABELS, SEVERITY_RANK, type Building } from "@/lib/types";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export default function MyReportsPage() {
  const [reports, setReports] = useState<ReportView[] | null>(null);
  const [buildingFilter, setBuildingFilter] = useState("");
  const [buildings, setBuildings] = useState<Record<string, Building>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [mine, bs] = await Promise.all([
        api<{ reports: ReportView[] }>("/api/reports"),
        api<{ buildings: Building[] }>("/api/buildings"),
      ]);
      setReports(mine.reports);
      setBuildings(Object.fromEntries(bs.buildings.map((b) => [b.id, b])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your reports.");
    }
  }, []);

  useEffect(() => {
    getReporterToken();
    setBuildingFilter(new URLSearchParams(window.location.search).get("building") ?? "");
    load();
  }, [load]);

  async function act(id: string, action: "acknowledge" | "resolve" | "reopen") {
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/reports/${id}`, {
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
    try {
      await api(`/api/reports/${id}`, { method: "DELETE" });
      await load();
      setMessage("Report deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the report.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeAll() {
    if (!window.confirm("Delete ALL of your reports and photos from FixTrail? This cannot be undone.")) return;
    try {
      const res = await api<{ deleted: number }>("/api/reports", { method: "DELETE" });
      await load();
      setMessage(`Deleted ${res.deleted} report${res.deleted === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete your data.");
    }
  }

  const sortedReports = reports?.filter((report) => !buildingFilter || report.buildingId === buildingFilter).sort((a, b) =>
    SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
    new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime(),
  );

  async function downloadNotice(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${id}/notice`, {
        method: "POST",
        headers: { "x-reporter-token": getReporterToken() },
      });
      if (!res.ok) throw new Error("Could not generate the notice.");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `repair-notice-${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Notice downloaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate the notice.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h1>{buildingFilter ? `My reports at ${buildings[buildingFilter]?.name ?? "this building"}` : "My reports"}</h1>
      <p className="lead">
        This device manages these reports. Their submitted photos and descriptions are also visible to anyone
        on the building dashboard; unit labels and reporter identities are not shown there. If you clear your
        browser data you will lose access to owner controls, so download your notices.
      </p>

      <div aria-live="polite" role="status" className="meta" style={{ minHeight: "1.5rem" }}>{message}</div>
      {error && <div className="notice bad" role="alert">{error}</div>}

      {reports === null && !error && <p>Loading your reports…</p>}

      {sortedReports && sortedReports.length === 0 && (
        <div className="card">
          <p>{buildingFilter ? "You have no reports for this building yet." : "You have not reported anything yet."}</p>
          <Link className="btn" href={buildingFilter ? `/buildings/${buildingFilter}` : "/report"}>{buildingFilter ? "Back to building" : "Report a problem"}</Link>
        </div>
      )}

      {sortedReports?.map((r) => (
        <article key={r.id} className="card report" aria-labelledby={`t-${r.id}`}>
          <h3 id={`t-${r.id}`}>{CATEGORY_LABELS[r.category]}</h3>
          <p className="meta">
            {buildings[r.buildingId]?.name ?? "Building"}
            {r.unitLabel ? ` · Unit ${r.unitLabel}` : ""} · Reported {fmt(r.reportedAt)} · Response requested by {fmt(r.dueAt)}
          </p>
          {r.deadline.state === "overdue" && (
            <div className="notice bad" role="status">
              <strong>Overdue:</strong> the requested response date ({fmt(r.dueAt)}) has passed.
            </div>
          )}
          <p className="meta">Tenant: {r.tenantName} · Landlord or manager: {r.landlordName}</p>
          <div className="badges">
            <DeadlineBadge info={r.deadline} />
            <SeverityBadge severity={r.severity} />
            <StatusBadge status={r.status} />
          </div>
          {r.description && <p>{r.description}</p>}

          <div className="actions">
            <button className="btn small" onClick={() => downloadNotice(r.id)} disabled={busyId === r.id}>
              Download repair notice (PDF)
            </button>
            {r.status === "open" && (
              <button className="btn small secondary" onClick={() => act(r.id, "acknowledge")} disabled={busyId === r.id}>
                Landlord acknowledged
              </button>
            )}
            {r.status !== "resolved" && (
              <button className="btn small secondary" onClick={() => act(r.id, "resolve")} disabled={busyId === r.id}>
                Mark resolved
              </button>
            )}
            {r.status === "resolved" && (
              <button className="btn small secondary" onClick={() => act(r.id, "reopen")} disabled={busyId === r.id}>
                Reopen
              </button>
            )}
            <button className="btn small danger" onClick={() => remove(r.id)} disabled={busyId === r.id}>
              Delete
            </button>
          </div>
        </article>
      ))}

      {!buildingFilter && reports && reports.length > 0 && (
        <section className="card" aria-labelledby="privacy-title">
          <h2 id="privacy-title">Your data</h2>
          <p>You can remove everything FixTrail has stored for this device, photos included.</p>
          <button className="btn danger" onClick={removeAll}>Delete all my data</button>
        </section>
      )}
    </>
  );
}
