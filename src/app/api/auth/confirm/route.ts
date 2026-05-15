// src/app/api/auth/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { EmailOtpType } from "@supabase/supabase-js";

function getRedirectTarget(url: URL): string {
  return (
    url.searchParams.get("redirect_to") ||
    url.searchParams.get("redirectTo") ||
    "/work"
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
  if (redirectTo.startsWith("http")) {
    const parsed = new URL(redirectTo);

    if (parsed.origin !== origin) {
      return new URL("/work", origin).toString();
    }

    return parsed.toString();
  }

  if (!redirectTo.startsWith("/")) {
    return new URL("/work", origin).toString();
  }

  return new URL(redirectTo, origin).toString();
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const token_hash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") as EmailOtpType) || "signup";
  const redirectTo = getRedirectTarget(url);

  const fallbackRedirect = new URL(
    `/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo || "/work")}`,
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

  const finalRedirect = buildSafeWebRedirect(redirectTo, url.origin);

  return NextResponse.redirect(finalRedirect, 303);
}