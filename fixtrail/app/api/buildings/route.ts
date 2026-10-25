/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This API route lists available buildings and handles administrator requests to add an eligible hall to their account. It validates resident and admin access before changing building membership.
 */

import { json } from "@/lib/http";
import { getStore } from "@/lib/store";
import { getCurrentUser, getResidentProfile, isAdminEmail, isVerifiedVtUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

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

const addBuildingInput = z.object({ buildingId: z.string().uuid() }).strict();

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!isVerifiedVtUser(user)) return json({ error: "Please sign in with your verified Virginia Tech account." }, 401);
  if (!isAdminEmail(user.email)) return json({ error: "Only administrators can add extra halls." }, 403);
  const profile = await getResidentProfile(user.id);
  if (!profile) return json({ error: "Complete your resident profile first." }, 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Choose a Virginia Tech residence hall." }, 400);
  }
  const parsed = addBuildingInput.safeParse(body);
  if (!parsed.success) return json({ error: "Choose a Virginia Tech residence hall." }, 400);
  if (profile.buildingIds.includes(parsed.data.buildingId)) return json({ added: false });

  const admin = createSupabaseAdminClient();
  const building = await admin.from("buildings").select("id")
    .eq("id", parsed.data.buildingId).eq("is_vt_campus", true).maybeSingle();
  if (building.error) return json({ error: "Could not verify that residence hall." }, 500);
  if (!building.data) return json({ error: "Choose a listed Virginia Tech residence hall." }, 400);

  const inserted = await admin.from("resident_buildings").insert({ user_id: user.id, building_id: parsed.data.buildingId });
  if (inserted.error) {
    if (inserted.error.code === "23505") return json({ added: false });
    console.error("Could not add administrator building", inserted.error.message);
    return json({ error: "Could not add that residence hall. Please try again." }, 500);
  }
  return json({ added: true }, 201);
}
