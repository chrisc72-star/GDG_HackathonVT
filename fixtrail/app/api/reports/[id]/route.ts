import { hashToken, json } from "@/lib/http";
import { getCurrentResident } from "@/lib/auth";
import { toReportView } from "@/lib/serialize";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function loadOwned(req: Request, ctx: Ctx) {
  void req;
  const resident = await getCurrentResident();
  if (!resident) return { error: json({ error: "Please sign in first." }, 401) } as const;
  const hash = hashToken(resident.user.id);
  const { id } = await ctx.params;
  const store = getStore();
  const report = await store.getReport(id);
  // Same response for "missing" and "not yours" so IDs can't be probed.
  if (!report || report.reporterHash !== hash) {
    return { error: json({ error: "Report not found." }, 404) } as const;
  }
  return { store, report } as const;
}

/** Update status: acknowledge, resolve, or reopen. */
export async function PATCH(req: Request, ctx: Ctx) {
  const owned = await loadOwned(req, ctx);
  if ("error" in owned) return owned.error;

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
      patch = { status: "acknowledged" as const, acknowledgedAt: owned.report.acknowledgedAt ?? now, resolvedAt: null };
      break;
    case "resolve":
      patch = {
        status: "resolved" as const,
        acknowledgedAt: owned.report.acknowledgedAt ?? now,
        resolvedAt: now,
      };
      break;
    case "reopen":
      patch = {
        status: owned.report.acknowledgedAt ? ("acknowledged" as const) : ("open" as const),
        resolvedAt: null,
      };
      break;
    default:
      return json({ error: "Unknown action." }, 400);
  }

  const updated = await owned.store.updateReport(owned.report.id, patch);
  if (!updated) return json({ error: "Report not found." }, 404);
  return json({ report: toReportView(updated, now) });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const owned = await loadOwned(req, ctx);
  if ("error" in owned) return owned.error;
  await owned.store.deleteReport(owned.report.id);
  return json({ deleted: 1 });
}
