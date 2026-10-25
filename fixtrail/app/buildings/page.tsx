/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This page lists the residence halls available to the signed-in resident or administrator. It loads account access and passes allowed halls to the building-list interface.
 */

import { RuntimeBanner } from "@/components/RuntimeBanner";
import { getStore } from "@/lib/store";
import { getCurrentResident, isAdminEmail } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ResidentBuildings } from "@/components/ResidentBuildings";

export const dynamic = "force-dynamic";

export default async function BuildingsPage() {
  const resident = await getCurrentResident();
  if (!resident) redirect("/onboarding");
  const campusBuildings = (await getStore().listBuildings())
    .filter((building) => building.isVtCampus)
    .sort((a, b) => a.name.localeCompare(b.name));
  const isAdmin = isAdminEmail(resident.user.email);
  const accessibleIds = new Set(resident.profile.buildingIds);
  const buildings = campusBuildings.filter((building) => accessibleIds.has(building.id));
  const availableBuildings = isAdmin ? campusBuildings.filter((building) => !accessibleIds.has(building.id)) : [];
  return (
    <>
      <RuntimeBanner />
      <ResidentBuildings
        buildings={buildings}
        availableBuildings={availableBuildings}
        primaryBuildingId={resident.profile.buildingId}
        isAdmin={isAdmin}
      />
    </>
  );
}
