import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { CookieOptions } from "@supabase/ssr";

import { isNewSupabaseUser } from "@/lib/auth/google";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { claimPendingBroBotSubscriptionForUser } from "@/lib/stripe";

function claimedPendingSubscription(status: string | undefined): boolean {
  return (
    status === "claimed" ||
    status === "already_has_subscription" ||
    status === "already_claimed_by_user"
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeRedirectPath(
    requestUrl.searchParams.get("next") ??
      requestUrl.searchParams.get("redirectTo"),
    "/"
  );

  const signInError = new URL("/auth/sign-in", requestUrl.origin);
  signInError.searchParams.set("error", "oauth");
  signInError.searchParams.set("redirectTo", next);

  if (!code) {
    return NextResponse.redirect(signInError);
  }

  const cookieStore = await cookies();
  const pendingCookies: {
    name: string;
    value: string;
    options: CookieOptions;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options });
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Route handler still copies cookies onto the redirect below.
            }
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("[auth/callback] code exchange failed", error?.message);
    return NextResponse.redirect(signInError);
  }

  let claimedSubscription = false;
  if (data.user?.id) {
    try {
      const claimResult = await claimPendingBroBotSubscriptionForUser(
        data.user.id,
        data.user.email
      );
      claimedSubscription = claimedPendingSubscription(claimResult.status);
    } catch (claimError) {
      console.error("[auth/callback] pending subscription claim failed", claimError);
    }
  }

  const destination =
    claimedSubscription && (next === "/" || next.startsWith("/welcome"))
      ? "/brobot/chat?subscription=active"
      : next;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const origin =
    process.env.NODE_ENV !== "development" && forwardedHost
      ? `https://${forwardedHost}`
      : requestUrl.origin;

  const destinationUrl = new URL(destination, origin);
  if (isNewSupabaseUser(data.user?.created_at)) {
    destinationUrl.searchParams.set("signup", "google");
  }

  const redirectResponse = NextResponse.redirect(destinationUrl);
  for (const { name, value, options } of pendingCookies) {
    redirectResponse.cookies.set(name, value, options);
  }

  return redirectResponse;
}
