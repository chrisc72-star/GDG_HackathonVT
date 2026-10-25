/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This component explains whether the app is using persistent Supabase storage and a configured AI model or local demo behavior. It helps users understand the active runtime limitations.
 */

import { getRuntimeInfo } from "@/lib/runtime";

/** Honest status line: tells visitors when they are looking at demo behavior. */
export function RuntimeBanner() {
  const info = getRuntimeInfo();
  const notes: string[] = [];
  if (info.aiMode === "mock") {
    notes.push(
      "Demo classifier: it reads your written description with keyword matching and does not analyze the photo. Add a model key to enable photo analysis.",
    );
  }
  if (info.storeMode === "memory") {
    notes.push("Demo storage: data lives in memory and resets when the server restarts.");
  }
  if (notes.length === 0) return null;
  return (
    <div className="notice warn" role="note">
      <strong>Demo mode.</strong> {notes.join(" ")}
    </div>
  );
}
