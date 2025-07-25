import SignInClient from './signinclient';

export default async function SignInPage({
  searchParams,
}: {
  // Note: searchParams is a Promise here
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  // Await the real params
  const { redirectTo } = await searchParams;
  const dest = redirectTo ?? '/learn';

  return <SignInClient redirectTo={dest} />;
}