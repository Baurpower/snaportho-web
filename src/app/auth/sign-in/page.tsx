import SignInClient from "./signinclient";
import { safeRedirectPath } from "@/lib/auth/redirects";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; from?: string; error?: string }>;
}) {
  const { redirectTo, from, error } = await searchParams;

  const dest = safeRedirectPath(
    redirectTo,
    from === "brobot" ? "/brobot/chat" : "/"
  );

  return <SignInClient redirectTo={dest} oauthError={error === "oauth"} />;
}
