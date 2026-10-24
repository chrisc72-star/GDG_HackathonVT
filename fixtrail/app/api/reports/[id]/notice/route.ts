import { hashToken, json } from "@/lib/http";
import { getCurrentResident } from "@/lib/auth";
import { generateNoticePdf } from "@/lib/notice";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Generate a repair-notice PDF for one of the caller's own reports. */
export async function POST(req: Request, ctx: Ctx) {
  const resident = await getCurrentResident();
  if (!resident) return json({ error: "Please sign in first." }, 401);
  const hash = hashToken(resident.user.id);

  const { id } = await ctx.params;
  const store = getStore();
  const report = await store.getReport(id);
  if (!report || report.reporterHash !== hash || report.buildingId !== resident.profile.buildingId) {
    return json({ error: "Report not found." }, 404);
  }

  const building = await store.getBuilding(report.buildingId);
  if (!building) return json({ error: "Building not found." }, 404);

  const photo = await store.getPhoto(report);
  const pdf = await generateNoticePdf({
    report,
    building,
    tenantName: report.tenantName,
    landlordName: report.landlordName,
    photo,
    now: new Date(),
  });

  return new Response(Buffer.from(pdf), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="repair-notice-${report.id.slice(0, 8)}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
