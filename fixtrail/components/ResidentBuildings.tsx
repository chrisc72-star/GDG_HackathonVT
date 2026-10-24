"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import type { Building } from "@/lib/types";

interface ResidentBuildingsProps {
  buildings: Building[];
  availableBuildings: Building[];
  primaryBuildingId: string;
  isAdmin: boolean;
}

export function ResidentBuildings({ buildings: initialBuildings, availableBuildings: initialAvailable, primaryBuildingId, isAdmin }: ResidentBuildingsProps) {
  const [buildings, setBuildings] = useState(initialBuildings);
  const [availableBuildings, setAvailableBuildings] = useState(initialAvailable);
  const [buildingId, setBuildingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function addBuilding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = availableBuildings.find((building) => building.id === buildingId);
    if (!selected) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api("/api/buildings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ buildingId: selected.id }),
      });
      setBuildings((current) => [...current, selected].sort((a, b) => a.name.localeCompare(b.name)));
      setAvailableBuildings((current) => current.filter((building) => building.id !== selected.id));
      setBuildingId("");
      setMessage(`${selected.name} is now available to your administrator account.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that residence hall.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1>My buildings</h1>
      <p className="lead">{isAdmin
        ? "Your administrator account can access multiple halls. Other residents are limited to their selected hall."
        : "Your account can view and report issues only for the residence hall selected in your resident profile."}</p>

      {error && <div className="notice bad" role="alert">{error}</div>}
      {message && <div className="notice" role="status">{message}</div>}
      {buildings.length === 0 && (
        <div className="notice warn" role="status">Your selected hall is unavailable. Contact a FixTrail administrator for help.</div>
      )}
      <ul className="grid" style={{ listStyle: "none", padding: 0 }}>
        {buildings.map((building) => (
          <li key={building.id} className="card">
            <h2><Link href={`/buildings/${building.id}`}>{building.name}</Link></h2>
            <p className="meta">{building.addressLine}, {building.city}, {building.state}</p>
            {building.id === primaryBuildingId && <p className="meta">Your selected residence hall</p>}
          </li>
        ))}
      </ul>
      {!isAdmin && <p className="meta">To change your selected hall, contact a FixTrail administrator.</p>}
      {isAdmin && (
        <section className="card" aria-labelledby="admin-add-building-title">
          <h2 id="admin-add-building-title">Add a hall to your admin account</h2>
          {availableBuildings.length === 0 ? <p className="meta">You have access to every campus hall.</p> : (
            <form onSubmit={addBuilding} aria-busy={saving}>
              <div className="field">
                <label htmlFor="admin-add-hall">Virginia Tech residence hall</label>
                <select id="admin-add-hall" required value={buildingId} onChange={(event) => setBuildingId(event.target.value)}>
                  <option value="">Choose a hall…</option>
                  {availableBuildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}
                </select>
              </div>
              <button className="btn" type="submit" disabled={saving || !buildingId}>{saving ? "Adding hall…" : "Add hall"}</button>
            </form>
          )}
        </section>
      )}
    </>
  );
}
