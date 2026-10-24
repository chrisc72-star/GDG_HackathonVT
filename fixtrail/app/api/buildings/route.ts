import { json } from "@/lib/http";
import { getStore } from "@/lib/store";
import { getCurrentUser, getResidentProfile } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Please sign in first." }, 401);
  const profile = await getResidentProfile(user.id);
  if (profile) {
    const building = await getStore().getBuilding(profile.buildingId);
    return json({ buildings: building ? [building] : [] });
  }
  const buildings = (await getStore().listBuildings()).filter((building) => building.isVtCampus);
  return json({ buildings });
}

export async function POST() {
  return json({ error: "The Virginia Tech residence list is maintained by FixTrail admins." }, 403);
}
