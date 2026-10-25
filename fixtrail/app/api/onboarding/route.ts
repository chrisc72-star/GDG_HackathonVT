/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This API route provides the Virginia Tech residence-hall list and saves a verified resident’s onboarding profile. It validates identity and selected-hall data before persisting it.
 */

import { json } from "@/lib/http";
import { getCurrentUser, getResidentProfile, isVerifiedVtUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sanitizeText } from "@/lib/safety";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const onboardingInput = z.object({
  fullName: z.string().trim().min(1).max(100),
  roomNumber: z.string().trim().min(1).max(30),
  buildingId: z.string().uuid(),
}).strict();

export async function GET() {
  const user = await getCurrentUser();
  if (!isVerifiedVtUser(user)) return json({ error: "Sign in with a verified @vt.edu email." }, 401);
  const profile = await getResidentProfile(user.id);
  return json({ email: user.email, profile });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!isVerifiedVtUser(user)) return json({ error: "Sign in with a verified @vt.edu email." }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Please complete all resident profile fields." }, 400);
  }
  const parsed = onboardingInput.safeParse(body);
  if (!parsed.success) return json({ error: "Enter your name, room number, and a listed residence hall." }, 400);
  const verifiedEmail = user.email!;

  const admin = createSupabaseAdminClient();
  const building = await admin
    .from("buildings")
    .select("id")
    .eq("id", parsed.data.buildingId)
    .eq("is_vt_campus", true)
    .maybeSingle();
  if (building.error) return json({ error: "Could not verify that residence hall." }, 500);
  if (!building.data) return json({ error: "Choose a Virginia Tech campus residence hall from the list." }, 400);

  const profile = await getResidentProfile(user.id);
  if (profile) return json({ error: "Your resident profile has already been set up." }, 409);

  const inserted = await admin.from("profiles").insert({
    user_id: user.id,
    email: verifiedEmail.toLowerCase(),
    full_name: sanitizeText(parsed.data.fullName, 100),
    room_number: sanitizeText(parsed.data.roomNumber, 30),
    building_id: parsed.data.buildingId,
  });
  if (inserted.error) {
    console.error("Could not create resident profile", inserted.error.message);
    return json({ error: "Could not save your resident profile. Please try again." }, 500);
  }

  return json({ saved: true }, 201);
}
