/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This script inserts clearly labeled demo buildings and sample reports into Supabase for demonstrations. It reads local environment settings and uses server-side database access.
 */

/**
 * Load the fictional demo buildings and reports into Supabase so the building
 * dashboard has something to show.
 *
 *   npm run seed:supabase
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local. Safe to re-run.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { DEMO_BUILDINGS, buildSeedReports } from "../lib/seed";
import { reportToRow } from "../lib/supabaseStore";

function loadEnvFile(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnvFile(path.resolve(__dirname, "..", ".env.local"));
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
    process.exit(1);
  }
  const db = createClient(url, key, { auth: { persistSession: false } });

  const buildings = DEMO_BUILDINGS.map((b) => ({
    id: b.id,
    name: b.name,
    address_line: b.addressLine,
    city: b.city,
    state: b.state,
    is_demo: b.isDemo,
    is_vt_campus: b.isVtCampus,
  }));
  const b = await db.from("buildings").upsert(buildings);
  if (b.error) throw new Error(`buildings: ${b.error.message}`);

  const rows = buildSeedReports(new Date()).map(reportToRow);
  const r = await db.from("reports").upsert(rows);
  if (r.error) throw new Error(`reports: ${r.error.message}`);

  console.log(`Seeded ${buildings.length} buildings and ${rows.length} reports.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
