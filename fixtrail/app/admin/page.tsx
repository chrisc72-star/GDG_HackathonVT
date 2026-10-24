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
