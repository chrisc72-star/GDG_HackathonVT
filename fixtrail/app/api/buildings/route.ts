import { json } from "@/lib/http";
import { getStore } from "@/lib/store";
import { getCurrentUser, getResidentProfile } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Please sign in first." }, 401);
  const profile = await getResidentProfile(user.id);
  const campusBuildings = (await getStore().listBuildings())
    .filter((building) => building.isVtCampus)
    .sort((a, b) => a.name.localeCompare(b.name));
  if (profile) {
    const accessibleIds = new Set(profile.buildingIds);
    return json({
      buildings: campusBuildings.filter((building) => accessibleIds.has(building.id)),
    });
  }
  return json({ buildings: campusBuildings });
}

export async function POST(req: Request) {
  void req;
  const user = await getCurrentUser();
  if (!user) return json({ error: "Please sign in first." }, 401);
  const profile = await getResidentProfile(user.id);
  if (!profile) return json({ error: "Complete your resident profile first." }, 403);
  return json({ error: "Each account can access only the residence hall selected during onboarding." }, 403);
}
