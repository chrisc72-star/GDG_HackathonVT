/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This module reports whether persistent storage and a real image-classification model are configured. It supplies the status shown by the runtime banner.
 */

export interface RuntimeInfo {
  /** A hosted image model is configured for photo analysis. */
  aiMode: "model" | "mock";
  aiModel: string | null;
  storeMode: "supabase" | "memory";
}

export function getRuntimeInfo(): RuntimeInfo {
  const hasGemma = !!process.env.GEMINI_API_KEY;
  const hasClaude = !!process.env.ANTHROPIC_API_KEY && !!process.env.AI_MODEL;
  const hasModel = hasGemma || hasClaude;
  return {
    aiMode: hasModel ? "model" : "mock",
    aiModel: hasGemma
      ? process.env.GEMINI_MODEL || "gemma-4-26b-a4b-it"
      : hasClaude ? (process.env.AI_MODEL as string) : null,
    storeMode:
      process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "memory",
  };
}
