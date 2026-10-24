"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import type { Building } from "@/lib/types";

export default function NewBuildingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await api<{ building: Building }>("/api/buildings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, addressLine, city, state }),
      });
      router.push(`/buildings/${result.building.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the building. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <p><Link href="/buildings">← Back to buildings</Link></p>
      <h1>Add a building</h1>
      <p className="lead">
        Add the shared building location so residents can select it when they report a repair.
      </p>
      <div className="notice warn" role="note">
        Building names and addresses are visible to visitors. Don’t include an apartment or unit number.
      </div>
      {error && <div className="notice bad" role="alert">{error}</div>}
      <form className="card" onSubmit={submit} aria-busy={saving}>
        <div className="field">
          <label htmlFor="building-name">Building name</label>
          <input id="building-name" type="text" autoComplete="organization" minLength={2} maxLength={100} required value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="building-address">Street address</label>
          <input id="building-address" type="text" autoComplete="street-address" minLength={3} maxLength={160} required value={addressLine} onChange={(event) => setAddressLine(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="building-city">City</label>
          <input id="building-city" type="text" autoComplete="address-level2" minLength={2} maxLength={100} required value={city} onChange={(event) => setCity(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="building-state">State or region</label>
          <input id="building-state" type="text" autoComplete="address-level1" minLength={2} maxLength={40} required value={state} onChange={(event) => setState(event.target.value)} />
        </div>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Adding building…" : "Add building"}
        </button>
      </form>
    </>
  );
}
