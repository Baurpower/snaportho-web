// src/app/api/auth/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { claimPendingBroBotSubscriptionForUser } from "@/lib/stripe";

function getRedirectTarget(url: URL): string {
  return (
    url.searchParams.get("redirect_to") ||
    url.searchParams.get("redirectTo") ||
    "/"
  );
}

function isNativeAppRedirect(redirectTo: string): boolean {
  return (
    redirectTo.startsWith("snaportho://") ||
    redirectTo.startsWith("mycases://") ||
    redirectTo.startsWith("workspace://")
  );
}

function buildAppRedirect(
  redirectTo: string,
  tokenHash: string,
  type: string
): URL {
  const appURL = new URL(redirectTo);
  appURL.searchParams.set("token_hash", tokenHash);
  appURL.searchParams.set("type", type);
  return appURL;
}

function buildSafeWebRedirect(redirectTo: string, origin: string): string {
  return new URL(safeRedirectPath(redirectTo, "/"), origin).toString();
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const token_hash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") as EmailOtpType) || "signup";
  const redirectTo = getRedirectTarget(url);
  const safeWebRedirectTo = safeRedirectPath(redirectTo, "/");

  const fallbackRedirect = new URL(
    `/auth/sign-in?redirectTo=${encodeURIComponent(safeWebRedirectTo)}`,
    url.origin
  );

  if (!token_hash) {
    return NextResponse.redirect(fallbackRedirect, 303);
  }

  if (isNativeAppRedirect(redirectTo)) {
    const appRedirectURL = buildAppRedirect(redirectTo, token_hash, type);
    return NextResponse.redirect(appRedirectURL, 303);
  }

  const supabase = createRouteHandlerClient({ cookies });

  const { data, error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  });

  if (error || !data?.session) {
    return NextResponse.redirect(fallbackRedirect, 303);
  }

  await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  let claimedSubscription = false;
  if (data.user?.id) {
    try {
      const claimResult = await claimPendingBroBotSubscriptionForUser(
        data.user.id,
        data.user.email
      );
      claimedSubscription = [
        "claimed",
        "already_has_subscription",
        "already_claimed_by_user",
      ].includes(claimResult.status);
    } catch (error) {
      console.error("[auth/confirm] pending subscription claim failed", error);
    }
  }

  if (claimedSubscription && (safeWebRedirectTo === "/" || safeWebRedirectTo.startsWith("/welcome"))) {
    return NextResponse.redirect(new URL("/brobot/chat?subscription=active", url.origin), 303);
  }

  const finalRedirect = buildSafeWebRedirect(redirectTo, url.origin);

  return NextResponse.redirect(finalRedirect, 303);
}
