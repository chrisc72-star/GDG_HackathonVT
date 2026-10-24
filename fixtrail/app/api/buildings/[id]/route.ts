import { summarizeBuilding } from "@/lib/aggregate";
import { json } from "@/lib/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Public, aggregate-only view of a building. No units, descriptions, or photos. */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const store = getStore();
  const building = await store.getBuilding(id);
  if (!building) return json({ error: "Building not found." }, 404);
  const reports = await store.listReportsForBuilding(id);
  return json({ building, summary: summarizeBuilding(reports, new Date()) });
}
