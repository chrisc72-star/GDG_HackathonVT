import Link from "next/link";
import { RuntimeBanner } from "@/components/RuntimeBanner";
import { getStore } from "@/lib/store";
import { getCurrentResident } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BuildingsPage() {
  const resident = await getCurrentResident();
  if (!resident) redirect("/onboarding");
  const building = await getStore().getBuilding(resident.profile.buildingId);
  const buildings = building ? [building] : [];
  return (
    <>
      <RuntimeBanner />
      <h1>My building</h1>
      <p className="lead">
        You can view and report issues only for the residence hall selected in your resident profile.
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
