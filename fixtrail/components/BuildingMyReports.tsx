"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import type { ReportView } from "@/lib/serialize";
import { CATEGORY_LABELS, type Category } from "@/lib/types";

export function BuildingMyReports({ buildingId }: { buildingId: string }) {
  const [reports, setReports] = useState<ReportView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ reports: ReportView[] }>("/api/reports")
      .then(({ reports: mine }) => setReports(mine.filter((report) => report.buildingId === buildingId)))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your report analysis."));
  }, [buildingId]);

  const analysis = useMemo(() => {
    if (!reports) return null;
    const open = reports.filter((report) => report.status !== "resolved");
    const rows = new Map<Category, { open: number; total: number }>();
    for (const report of reports) {
      const row = rows.get(report.category) ?? { open: 0, total: 0 };
      row.total += 1;
      if (report.status !== "resolved") row.open += 1;
      rows.set(report.category, row);
    }
    return {
      total: reports.length,
      open: open.length,
      overdue: open.filter((report) => report.deadline.state === "overdue").length,
      resolved: reports.filter((report) => report.status === "resolved").length,
      categories: [...rows.entries()]
        .map(([category, count]) => ({ category, ...count }))
        .sort((a, b) => b.open - a.open || b.total - a.total),
    };
  }, [reports]);

  return (
    <section className="card" aria-labelledby="device-analysis-title">
      <h2 id="device-analysis-title">Analysis of your reports</h2>
      <p className="meta">Private summary of reports created on this device for this building.</p>
      {reports === null && !error && <p>Loading your report analysis…</p>}
      {error && <p className="notice bad" role="alert">{error} <Link href="/reports">Open My reports</Link></p>}
      {analysis && analysis.total === 0 && <p>You have no reports for this building on this device.</p>}
      {analysis && analysis.total > 0 && (
        <>
          <section aria-label="Your report summary" className="grid cols-4" style={{ marginBottom: "1.25rem" }}>
            <div className="card stat"><div className="num">{analysis.total}</div><div className="lbl">Total reports</div></div>
            <div className="card stat"><div className="num">{analysis.open}</div><div className="lbl">Open reports</div></div>
            <div className="card stat"><div className="num">{analysis.overdue}</div><div className="lbl">Past response time</div></div>
            <div className="card stat"><div className="num">{analysis.resolved}</div><div className="lbl">Resolved</div></div>
          </section>
          <h3>Reports by category</h3>
          <table>
            <thead>
              <tr><th scope="col">Category</th><th scope="col">Open</th><th scope="col">Total</th></tr>
            </thead>
            <tbody>
              {analysis.categories.map((row) => (
                <tr key={row.category}>
                  <th scope="row">{CATEGORY_LABELS[row.category]}</th>
                  <td>{row.open}</td>
                  <td>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <p><Link href={`/reports?building=${buildingId}`}>Manage your reports</Link></p>
    </section>
  );
}