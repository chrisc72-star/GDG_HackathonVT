import Link from "next/link";
import { RuntimeBanner } from "@/components/RuntimeBanner";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function BuildingsPage() {
  const buildings = await getStore().listBuildings();
  return (
    <>
      <RuntimeBanner />
      <h1>Buildings</h1>
      <p className="lead">
        Combined, anonymous repair activity for each building. Individual reports are never shown.
      </p>
      <p>
        <Link className="btn" href="/buildings/new">Add a building</Link>
      </p>
      <ul className="grid" style={{ listStyle: "none", padding: 0 }}>
        {buildings.map((b) => (
          <li key={b.id} className="card">
            <h2>
              <Link href={`/buildings/${b.id}`}>{b.name}</Link>
            </h2>
            <p className="meta">
              {b.addressLine}, {b.city}, {b.state}
              {b.isDemo ? " · sample data" : ""}
            </p>
          </li>
        ))}
        {buildings.length === 0 && <li className="card">No buildings have been added yet.</li>}
      </ul>
    </>
  );
}
