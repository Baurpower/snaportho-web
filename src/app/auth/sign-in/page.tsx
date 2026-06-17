import SignInClient from "./signinclient";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; from?: string }>;
}) {
  const { redirectTo, from } = await searchParams;

  const dest =
    redirectTo && redirectTo.startsWith("/")
      ? redirectTo
      : from === "brobot"
        ? "/brobot/chat"
      : "/work";

  return <SignInClient redirectTo={dest} />;
}
