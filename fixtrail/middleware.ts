import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const VT_EMAIL = /^[^\s@]+@vt\.edu$/i;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/auth/callback";
  const isApi = pathname.startsWith("/api/");
  const onboardingPath = pathname === "/onboarding" || pathname.startsWith("/api/onboarding");
  const buildingOptions = pathname === "/api/buildings" && request.method === "GET";

  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    if (isApi) return Response.json({ error: "Supabase Auth is not configured." }, { status: 503 });
    if (isPublicPage) return response;
    return NextResponse.redirect(new URL("/login?setup=missing", request.url));
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (isPublicPage) return response;
    if (isApi) return Response.json({ error: "Please sign in with your Virginia Tech email." }, { status: 401 });
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (!VT_EMAIL.test(user.email ?? "") || !user.email_confirmed_at) {
    if (isApi) return Response.json({ error: "FixTrail is currently limited to @vt.edu accounts." }, { status: 403 });
    if (!isPublicPage) return NextResponse.redirect(new URL("/login?error=vt-email", request.url));
    return response;
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/buildings", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (onboardingPath || buildingOptions) {
    if (profile && (pathname === "/onboarding" || pathname === "/api/onboarding")) {
      if (isApi) return response;
      return NextResponse.redirect(new URL("/buildings", request.url));
    }
    return response;
  }

  if (!profile) {
    if (isApi) return Response.json({ error: "Complete your resident profile to continue." }, { status: 403 });
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
