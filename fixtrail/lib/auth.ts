import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ResidentProfile {
  userId: string;
  email: string;
  fullName: string;
  roomNumber: string;
  buildingId: string;
}

export function isVtEmail(email: string | undefined | null): email is string {
  return !!email && /^[^\s@]+@vt\.edu$/i.test(email.trim());
}

export function isVerifiedVtUser(user: Pick<User, "email" | "email_confirmed_at"> | null | undefined): user is User {
  return !!user && isVtEmail(user.email) && !!user.email_confirmed_at;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function getResidentProfile(userId: string): Promise<ResidentProfile | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("profiles")
    .select("user_id,email,full_name,room_number,building_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load resident profile.");
  if (!data) return null;
  return {
    userId: data.user_id,
    email: data.email,
    fullName: data.full_name,
    roomNumber: data.room_number,
    buildingId: data.building_id,
  };
}

export async function getCurrentResident(): Promise<{ user: User; profile: ResidentProfile } | null> {
  const user = await getCurrentUser();
  if (!isVerifiedVtUser(user)) return null;
  const profile = await getResidentProfile(user.id);
  return profile ? { user, profile } : null;
}
