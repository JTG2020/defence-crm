import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "./lib/supabase/config";

// Inlined at build time (Edge runtime), so AUTH_DISABLED must be present BEFORE the build:
// set it in Vercel, then redeploy. Parse tolerantly so "TRUE", "1", "on" or a stray space work.
const AUTH_DISABLED_RAW = process.env.AUTH_DISABLED;
const AUTH_DISABLED =
  AUTH_DISABLED_RAW !== undefined &&
  ["true", "1", "yes", "on"].includes(AUTH_DISABLED_RAW.trim().toLowerCase());
if (AUTH_DISABLED_RAW !== undefined && !AUTH_DISABLED) {
  console.warn(
    "[proxy] AUTH_DISABLED is set but not recognised as true:",
    JSON.stringify(AUTH_DISABLED_RAW),
  );
}

// Next 16 "proxy" (the former middleware). Refreshes the Supabase session cookie and gates every
// route behind sign-in.
// If Supabase is not configured, requests pass through so the pages can say which setting is missing.
// If the session check throws, we never surface a platform 500: the failure is logged and the
// visitor is sent to /login, which is public and will render the honest reason.
export async function proxy(request: NextRequest) {
  // PREVIEW MODE: AUTH_DISABLED=true skips the sign-in gate. Pair it with the anon policies in
  // supabase/demo/012_preview_anon_write.sql, or screens are empty. Remove it to restore sign-in.
  if (AUTH_DISABLED) {
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
