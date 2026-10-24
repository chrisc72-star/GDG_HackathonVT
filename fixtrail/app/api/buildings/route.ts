import { clientIp, json } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { sanitizeText } from "@/lib/safety";
import { getStore } from "@/lib/store";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const buildings = await getStore().listBuildings();
  return json({ buildings });
}

const buildingInput = z.object({
  name: z.string().trim().min(2).max(100),
  addressLine: z.string().trim().min(3).max(160),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(40),
}).strict();

export async function POST(req: Request) {
  // Public creation is needed because this demo has no accounts. This in-memory
  // limit helps prevent casual spam; production-scale traffic needs shared limiting.
  if (!rateLimit(`create-building:${clientIp(req)}`, 10, 60 * 60_000)) {
    return json({ error: "Too many building submissions. Please try again later." }, 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Please submit the building details as a JSON form." }, 400);
  }

  const parsed = buildingInput.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Enter a building name, street address, city, and state or region." }, 400);
  }

  try {
    const building = await getStore().createBuilding({
      name: sanitizeText(parsed.data.name, 100),
      addressLine: sanitizeText(parsed.data.addressLine, 160),
      city: sanitizeText(parsed.data.city, 100),
      state: sanitizeText(parsed.data.state, 40),
    });
    return json({ building }, 201);
  } catch (error) {
    console.error("Could not create a building", error);
    return json({ error: "We couldn’t save that building. Please try again." }, 500);
  }
}
