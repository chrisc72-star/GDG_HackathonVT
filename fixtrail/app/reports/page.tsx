"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DeadlineBadge, SeverityBadge, StatusBadge } from "@/components/Badges";
import { api, getReporterToken } from "@/lib/client";
import type { ReportView } from "@/lib/serialize";
import { CATEGORY_LABELS, type Building } from "@/lib/types";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export default function MyReportsPage() {
  const [reports, setReports] = useState<ReportView[] | null>(null);
  const [buildings, setBuildings] = useState<Record<string, Building>>({});
  const [tenantName, setTenantName] = useState("");
  const [landlordName, setLandlordName] = useState("");
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
    setTenantName(localStorage.getItem("fixtrail.tenantName") ?? "");
    setLandlordName(localStorage.getItem("fixtrail.landlordName") ?? "");
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

  async function downloadNotice(id: string) {
    setBusyId(id);
    setError(null);
    try {
      localStorage.setItem("fixtrail.tenantName", tenantName);
      localStorage.setItem("fixtrail.landlordName", landlordName);
      const res = await fetch(`/api/reports/${id}/notice`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-reporter-token": getReporterToken() },
        body: JSON.stringify({ tenantName, landlordName }),
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
      <h1>My reports</h1>
      <p className="lead">
        Only this device can see these. If you clear your browser data you will lose access to them, so
        download your notices.
      </p>

      <div aria-live="polite" role="status" className="meta" style={{ minHeight: "1.5rem" }}>{message}</div>
      {error && <div className="notice bad" role="alert">{error}</div>}

      <section className="card" aria-labelledby="names-title">
        <h2 id="names-title">Notice details</h2>
        <p className="meta">Used on the PDF notice. Saved only in this browser.</p>
        <div className="grid cols-3">
          <div className="field">
            <label htmlFor="tenant">Your name</label>
            <input id="tenant" type="text" maxLength={80} value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="landlord">Landlord or manager</label>
            <input id="landlord" type="text" maxLength={80} value={landlordName} onChange={(e) => setLandlordName(e.target.value)} />
          </div>
        </div>
      </section>

      {reports === null && !error && <p>Loading your reports…</p>}

      {reports && reports.length === 0 && (
        <div className="card">
          <p>You have not reported anything yet.</p>
          <Link className="btn" href="/report">Report a problem</Link>
        </div>
      )}

      {reports?.map((r) => (
        <article key={r.id} className="card report" aria-labelledby={`t-${r.id}`}>
          <h3 id={`t-${r.id}`}>{CATEGORY_LABELS[r.category]}</h3>
          <p className="meta">
            {buildings[r.buildingId]?.name ?? "Building"}
            {r.unitLabel ? ` · Unit ${r.unitLabel}` : ""} · Reported {fmt(r.reportedAt)} · Response requested by {fmt(r.dueAt)}
          </p>
          <div className="badges">
            <DeadlineBadge info={r.deadline} />
            <SeverityBadge severity={r.severity} />
            <StatusBadge status={r.status} />
          </div>
          {r.description && <p>{r.description}</p>}
          {r.tenantEdited && (
            <p className="meta">You changed the suggested category or priority before saving.</p>
          )}

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

      {reports && reports.length > 0 && (
        <section className="card" aria-labelledby="privacy-title">
          <h2 id="privacy-title">Your data</h2>
          <p>You can remove everything FixTrail has stored for this device, photos included.</p>
          <button className="btn danger" onClick={removeAll}>Delete all my data</button>
        </section>
      )}
    </>
  );
}
