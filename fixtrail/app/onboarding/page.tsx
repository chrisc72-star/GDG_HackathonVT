"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import type { ResidentProfile } from "@/lib/auth";
import type { Building } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState("");
  const [fullName, setFullName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ email: string; profile: ResidentProfile | null }>("/api/onboarding"),
      api<{ buildings: Building[] }>("/api/buildings"),
    ]).then(([resident, catalog]) => {
      setEmail(resident.email);
      setBuildings(catalog.buildings);
      if (catalog.buildings.length === 1) setBuildingId(catalog.buildings[0].id);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load your onboarding details.");
    }).finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullName, roomNumber, buildingId }),
      });
      router.replace("/buildings");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your resident profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1>Set up your resident profile</h1>
      <p className="lead">Choose your primary Virginia Tech residence hall. After setup, you can add other halls from My Buildings to view and report issues there too.</p>
      {error && <div className="notice bad" role="alert">{error}</div>}
      {loading ? <p>Loading the residence list…</p> : buildings.length === 0 ? (
        <div className="notice warn" role="alert">
          No campus residence halls are configured yet. Ask the FixTrail administrator to run the Supabase campus-auth migration.
        </div>
      ) : (
        <form className="card" onSubmit={submit} aria-busy={saving}>
          <div className="field">
            <label htmlFor="resident-email">Verified Virginia Tech email</label>
            <input id="resident-email" type="email" value={email} readOnly />
          </div>
          <div className="field">
            <label htmlFor="resident-name">Full name</label>
            <input id="resident-name" type="text" autoComplete="name" minLength={1} maxLength={100} required value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="resident-building">Residence hall</label>
            <select id="resident-building" required value={buildingId} onChange={(event) => setBuildingId(event.target.value)}>
              <option value="">Choose your residence hall…</option>
              {buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="resident-room">Room number</label>
            <input id="resident-room" type="text" autoComplete="off" minLength={1} maxLength={30} required value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} />
            <span className="hint">Your room number is private. It is not shown on the community report feed.</span>
          </div>
          <button className="btn" type="submit" disabled={saving || !buildingId}>
            {saving ? "Saving profile…" : "Finish setup"}
          </button>
        </form>
      )}
    </>
  );
}
