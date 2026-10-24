import { summarizeBuilding } from "@/lib/aggregate";
import { json } from "@/lib/http";
import { getStore } from "@/lib/store";
import { getCurrentResident } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Public, aggregate-only view of a building. No units, descriptions, or photos. */
export async function GET(_req: Request, ctx: Ctx) {
  const resident = await getCurrentResident();
  if (!resident) return json({ error: "Please sign in first." }, 401);
  const { id } = await ctx.params;
  if (id !== resident.profile.buildingId) return json({ error: "Building not found." }, 404);
  const store = getStore();
  const building = await store.getBuilding(id);
  if (!building) return json({ error: "Building not found." }, 404);
  const reports = await store.listReportsForBuilding(id);
  return json({ building, summary: summarizeBuilding(reports, new Date()) });
}
