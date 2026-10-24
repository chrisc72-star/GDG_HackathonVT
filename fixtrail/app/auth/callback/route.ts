import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNext(path: string | null): string {
  return path?.startsWith("/") && !path.startsWith("//") ? path : "/onboarding";
}

export async function GET(request: NextRequest) {
  const authError = request.nextUrl.searchParams.get("error");
  if (authError) return NextResponse.redirect(new URL("/login?error=oauth", request.url));

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?error=link", request.url));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=link", request.url));

  return NextResponse.redirect(new URL(safeNext(request.nextUrl.searchParams.get("next")), request.url));
}
