/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This page redirects visitors from the retired custom-building flow to the supported building list. It keeps the old route from creating unverified building records.
 */

import { redirect } from "next/navigation";

export default function NewBuildingPage() {
  redirect("/buildings");
}
