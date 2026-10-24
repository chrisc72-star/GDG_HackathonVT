import Link from "next/link";
import { notFound } from "next/navigation";
import { RuntimeBanner } from "@/components/RuntimeBanner";
import { K_THRESHOLD, summarizeBuilding } from "@/lib/aggregate";
import { getStore } from "@/lib/store";
import { CATEGORY_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const building = await store.getBuilding(id);
  if (!building) notFound();

  const summary = summarizeBuilding(await store.listReportsForBuilding(id), new Date());

  return (
    <>
      <RuntimeBanner />
      <p className="meta">
        <Link href="/buildings">All buildings</Link>
      </p>
      <h1>{building.name}</h1>
      <p className="meta">
        {building.addressLine}, {building.city}, {building.state}
        {building.isDemo ? " · sample data, not a real building" : ""}
      </p>

      {summary.insufficientData ? (
        <div className="notice" role="status">
          <strong>Not enough reports to show details.</strong> To protect privacy, this page shows nothing
          until at least {K_THRESHOLD} different households have reported. Be one of them.
          <div className="actions">
            <Link className="btn" href={`/report?building=${building.id}`}>Report a problem here</Link>
          </div>
        </div>
      ) : (
        <>
          <section aria-label="Summary" className="grid cols-4" style={{ marginBottom: "1.25rem" }}>
            <div className="card stat"><div className="num">{summary.open}</div><div className="lbl">Open reports</div></div>
            <div className="card stat"><div className="num">{summary.overdue}</div><div className="lbl">Past the requested response time</div></div>
            <div className="card stat"><div className="num">{summary.resolved}</div><div className="lbl">Resolved</div></div>
            <div className="card stat">
              <div className="num">{summary.medianDaysToResolve ?? "n/a"}</div>
              <div className="lbl">Median days to resolve</div>
            </div>
          </section>

          {summary.patterns.length > 0 && (
            <section className="notice warn" aria-labelledby="patterns-title">
              <h2 id="patterns-title">Patterns in this building</h2>
              <ul>
                {summary.patterns.map((p) => (
                  <li key={p.category}>
                    <strong>{CATEGORY_LABELS[p.category]}:</strong> {p.openCount} open reports from{" "}
                    {p.households} different households.
                  </li>
                ))}
              </ul>
              <p>
                Several households reporting the same kind of problem can point to a building-wide cause.
                Consider raising it together, for example through a tenant association.
              </p>
            </section>
          )}

          <section className="card" aria-labelledby="cat-title">
            <h2 id="cat-title">Reports by category</h2>
            <table>
              <caption className="sr-only" style={{ position: "absolute", left: "-9999px" }}>
                Open and total reports per category
              </caption>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Open</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.byCategory.map((row) => (
                  <tr key={row.category}>
                    <th scope="row">{CATEGORY_LABELS[row.category]}</th>
                    <td>{row.open}</td>
                    <td>{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="actions">
            <Link className="btn" href={`/report?building=${building.id}`}>Report a problem here</Link>
          </div>
        </>
      )}

      <p className="meta" style={{ marginTop: "1.5rem" }}>
        Numbers come from tenant-submitted reports and may not reflect every household. They show
        reporting activity, not a finding about any landlord.
      </p>
    </>
  );
}
