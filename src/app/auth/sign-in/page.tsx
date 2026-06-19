import SignInClient from "./signinclient";
import { safeRedirectPath } from "@/lib/auth/redirects";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; from?: string }>;
}) {
  const { redirectTo, from } = await searchParams;

  const dest = safeRedirectPath(
    redirectTo,
    from === "brobot" ? "/brobot/chat" : "/"
  );

  return <SignInClient redirectTo={dest} />;
}
