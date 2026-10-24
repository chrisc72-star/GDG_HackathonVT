export interface RuntimeInfo {
  /** "gemini" means a real model id is configured (it may be a Gemma or Gemini model). */
  aiMode: "model" | "mock";
  aiModel: string | null;
  storeMode: "supabase" | "memory";
}

export function getRuntimeInfo(): RuntimeInfo {
  const hasModel = !!process.env.GEMINI_API_KEY && !!process.env.AI_MODEL;
  return {
    aiMode: hasModel ? "model" : "mock",
    aiModel: hasModel ? (process.env.AI_MODEL as string) : null,
    storeMode:
      process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "memory",
  };
}
