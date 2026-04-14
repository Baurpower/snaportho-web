// src/app/api/auth/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { EmailOtpType } from "@supabase/supabase-js";

function getRedirectTarget(url: URL): string {
  return (
    url.searchParams.get("redirect_to") ||
    url.searchParams.get("redirectTo") ||
    "/onboarding"
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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const token_hash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") as EmailOtpType) || "signup";
  const redirectTo = getRedirectTarget(url);

  if (!token_hash) {
    return NextResponse.redirect(
      new URL("/auth/sign-in?redirectTo=/onboarding", url.origin),
      303
    );
  }

  // Native app flow:
  // Do NOT verify on the server.
  // Forward token_hash + type to the app so the app can verify it itself.
  if (isNativeAppRedirect(redirectTo)) {
    const appRedirectURL = buildAppRedirect(redirectTo, token_hash, type);
    return NextResponse.redirect(appRedirectURL, 303);
  }

  // Web flow:
  // Verify OTP on the server and set browser session cookies.
  const supabase = createRouteHandlerClient({ cookies });

  const { data, error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  });

  if (error || !data?.session) {
    return NextResponse.redirect(
      new URL("/auth/sign-in?redirectTo=/onboarding", url.origin),
      303
    );
  }

  await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  const finalRedirect = redirectTo.startsWith("http")
    ? redirectTo
    : new URL(redirectTo, url.origin).toString();

  const res = NextResponse.redirect(finalRedirect, 303);

  res.cookies.delete("sb-access-token");
  res.cookies.delete("sb-refresh-token");

  return res;
}