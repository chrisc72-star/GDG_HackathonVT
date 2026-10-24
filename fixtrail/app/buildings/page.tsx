import { RuntimeBanner } from "@/components/RuntimeBanner";
import { getStore } from "@/lib/store";
import { getCurrentResident } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ResidentBuildings } from "@/components/ResidentBuildings";

export const dynamic = "force-dynamic";

export default async function BuildingsPage() {
  const resident = await getCurrentResident();
  if (!resident) redirect("/onboarding");
  const campusBuildings = (await getStore().listBuildings())
    .filter((building) => building.isVtCampus)
    .sort((a, b) => a.name.localeCompare(b.name));
  const accessibleIds = new Set(resident.profile.buildingIds);
  const buildings = campusBuildings.filter((building) => accessibleIds.has(building.id));
  const availableBuildings = campusBuildings.filter((building) => !accessibleIds.has(building.id));
  return (
    <>
      <RuntimeBanner />
      <ResidentBuildings buildings={buildings} availableBuildings={availableBuildings} primaryBuildingId={resident.profile.buildingId} />
    </>
  );
}
