import { json } from "@/lib/http";
import { getCurrentResident } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Public image endpoint for reports shown in the building community feed. */
export async function GET(_req: Request, ctx: Ctx) {
  const resident = await getCurrentResident();
  if (!resident) return json({ error: "Please sign in first." }, 401);
  const { id } = await ctx.params;
  const store = getStore();
  const report = await store.getReport(id);
  if (!report?.isPublic || !report.photoPath || report.buildingId !== resident.profile.buildingId) {
    return json({ error: "Photo not found." }, 404);
  }

  const photo = await store.getPhoto(report);
  if (!photo) return json({ error: "Photo not found." }, 404);

  return new Response(Buffer.from(photo.bytes), {
    status: 200,
    headers: {
      "content-type": photo.mime,
      "content-disposition": "inline",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
