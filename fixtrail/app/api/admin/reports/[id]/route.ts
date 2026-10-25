/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This API route lets authorized administrators update or delete one report. It validates admin access and applies status changes through the shared report store.
 */

import { getCurrentUser, isAdminEmail, isVerifiedVtUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { toReportView } from "@/lib/serialize";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function adminRequest(ctx: Ctx) {
  const user = await getCurrentUser();
  if (!isVerifiedVtUser(user) || !isAdminEmail(user.email)) {
    return { error: json({ error: "Administrator access required." }, 403) } as const;
  }
  const { id } = await ctx.params;
  const store = getStore();
  const report = await store.getReport(id);
  if (!report) return { error: json({ error: "Report not found." }, 404) } as const;
  return { store, report } as const;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const loaded = await adminRequest(ctx);
  if ("error" in loaded) return loaded.error;
  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const now = new Date();
  let patch;
  switch (body.action) {
    case "acknowledge":
      patch = { status: "acknowledged" as const, acknowledgedAt: loaded.report.acknowledgedAt ?? now, resolvedAt: null };
      break;
    case "resolve":
      patch = { status: "resolved" as const, acknowledgedAt: loaded.report.acknowledgedAt ?? now, resolvedAt: now };
      break;
    case "reopen":
      patch = {
        status: loaded.report.acknowledgedAt ? ("acknowledged" as const) : ("open" as const),
        resolvedAt: null,
      };
      break;
    default:
      return json({ error: "Unknown report action." }, 400);
  }
  const updated = await loaded.store.updateReport(loaded.report.id, patch);
  if (!updated) return json({ error: "Report not found." }, 404);
  return json({ report: toReportView(updated, now) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const loaded = await adminRequest(ctx);
  if ("error" in loaded) return loaded.error;
  await loaded.store.deleteReport(loaded.report.id);
  return json({ deleted: 1 });
}
