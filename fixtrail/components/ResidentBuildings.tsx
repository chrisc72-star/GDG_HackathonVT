"use client";

import Link from "next/link";
import type { Building } from "@/lib/types";

interface ResidentBuildingsProps {
  building: Building | null;
}

export function ResidentBuildings({ building }: ResidentBuildingsProps) {
  return (
    <>
      <h1>My buildings</h1>
      <p className="lead">Your account can view and report issues only for the residence hall selected in your resident profile.</p>

      {building ? (
        <section className="card">
          <h2><Link href={`/buildings/${building.id}`}>{building.name}</Link></h2>
          <p className="meta">{building.addressLine}, {building.city}, {building.state}</p>
          <p className="meta">Your selected residence hall</p>
        </section>
      ) : (
        <div className="notice warn" role="status">Your selected hall is unavailable. Contact a FixTrail administrator for help.</div>
      )}
      <p className="meta">To change your selected hall, contact a FixTrail administrator.</p>
    </>
  );
}
