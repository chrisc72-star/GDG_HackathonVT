import { json } from "@/lib/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const buildings = await getStore().listBuildings();
  return json({ buildings });
}
