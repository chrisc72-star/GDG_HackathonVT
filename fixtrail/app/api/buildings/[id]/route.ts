/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This API route returns a building and its public aggregate summary. It checks the requested building and serializes only the data intended for that view.
 */

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
  if (!resident.profile.buildingIds.includes(id)) return json({ error: "Building not found." }, 404);
  const store = getStore();
  const building = await store.getBuilding(id);
  if (!building) return json({ error: "Building not found." }, 404);
  const reports = await store.listReportsForBuilding(id);
  return json({ building, summary: summarizeBuilding(reports, new Date()) });
}
