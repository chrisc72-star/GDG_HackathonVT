/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This page is the server-rendered entry point for the administrator report dashboard. It checks the current user’s verified Virginia Tech and admin access before showing the management interface.
 */

import { notFound, redirect } from "next/navigation";
import { AdminReports } from "@/components/AdminReports";
import { getCurrentUser, isAdminEmail, isVerifiedVtUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!isVerifiedVtUser(user)) redirect("/login?next=%2Fadmin");
  if (!isAdminEmail(user.email)) notFound();
  return <AdminReports />;
}
