import SignUpClient from './signupclient';

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  const dest = redirectTo ?? '/learn';
  return <SignUpClient redirectTo={dest} />;
}