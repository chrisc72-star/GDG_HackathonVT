/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This API route returns reports across buildings to authorized administrators. It includes the building labels needed by the admin dashboard while keeping the endpoint behind server-side access checks.
 */

import { getCurrentUser, isAdminEmail, isVerifiedVtUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { toReportView } from "@/lib/serialize";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!isVerifiedVtUser(user) || !isAdminEmail(user.email)) {
    return json({ error: "Administrator access required." }, 403);
  }

  const store = getStore();
  const buildings = (await store.listBuildings()).filter((building) => building.isVtCampus);
  const groups = await Promise.all(buildings.map(async (building) => {
    const reports = await store.listReportsForBuilding(building.id);
    return reports.map((report) => ({
      report: toReportView(report, new Date()),
      buildingName: building.name,
    }));
  }));
  const reports = groups.flat().sort((a, b) =>
    new Date(b.report.reportedAt).getTime() - new Date(a.report.reportedAt).getTime(),
  );

  return json({ reports });
}
