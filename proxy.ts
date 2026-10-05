import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "./lib/supabase/config";

// Sign-in is OFF by default so the deployed demo is usable without credentials (e.g. for judges).
// Set AUTH_REQUIRED=true in Vercel AND REDEPLOY to require sign-in again: this value is inlined at
// build time in the Edge runtime, so adding the env var alone does nothing until a new build.
const AUTH_REQUIRED = process.env.AUTH_REQUIRED === "true";

// Next 16 "proxy" (the former middleware). Refreshes the Supabase session cookie and gates every
// route behind sign-in.
// If Supabase is not configured, requests pass through so the pages can say which setting is missing.
// If the session check throws, we never surface a platform 500: the failure is logged and the
// visitor is sent to /login, which is public and will render the honest reason.
export async function proxy(request: NextRequest) {
  // Sign-in is not required by default. AUTH_REQUIRED=true turns the gate back on.
  if (!AUTH_REQUIRED) {
    return NextResponse.next({ request });
  }

  const path = request.nextUrl.pathname;
  const isAuthRoute = path === "/login" || path.startsWith("/auth");

  const config = supabaseConfig();
  if (!config) {
    // Not configured (or the URL is malformed): send visitors to /login, which names the setting.
    if (isAuthRoute) return NextResponse.next({ request });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  try {
    let response = NextResponse.next({ request });
    const supabase = createServerClient(config.url, config.key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // getClaims() verifies the JWT locally (cached JWKS) - no network round-trip on the happy path,
    // which is what makes every request slow. Fall back to getUser() only if it errors.
    let signedIn = false;
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      signedIn = !!user;
    } else {
      signedIn = !!claimsData?.claims;
    }

    if (!signedIn && !isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    if (signedIn && path === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    return response;
  } catch (error) {
    console.error("middleware: session check failed", error);
    if (isAuthRoute) return NextResponse.next({ request });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("error", "session check failed");
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
