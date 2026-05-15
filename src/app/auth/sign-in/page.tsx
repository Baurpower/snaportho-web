import SignInClient from "./signinclient";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  const dest =
    redirectTo && redirectTo.startsWith("/")
      ? redirectTo
      : "/work";

  return <SignInClient redirectTo={dest} />;
}