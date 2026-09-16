import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import GraduationYearForm from './graduation-year-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Add your graduation year',
  robots: { index: false, follow: false },
};

const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;

export default async function GraduationYearPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const campaign = new URLSearchParams();
  for (const key of campaignKeys) {
    const value = params[key];
    if (typeof value === 'string' && value.length <= 150) campaign.set(key, value);
  }
  const suffix = campaign.size ? `?${campaign.toString()}` : '';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/sign-in?${new URLSearchParams({ redirectTo: `/account/grad-year${suffix}` })}`);
  }

  const { data: profile, error } = await supabase.from('user_profiles')
    .select('training_level,grad_year').eq('user_id', user.id).maybeSingle();

  if (error) {
    return <main className="mx-auto max-w-xl px-5 py-24 text-midnight"><h1 className="text-3xl font-bold">We couldn’t load your profile</h1><p className="mt-4">Please try again in a moment.</p></main>;
  }

  if (profile?.grad_year) redirect(`/whats-new${suffix}`);

  if (profile?.training_level !== 'MD/DO Student') {
    return (
      <main className="mx-auto max-w-xl px-5 py-24 text-midnight">
        <h1 className="text-3xl font-bold">Your profile has changed</h1>
        <p className="mt-4 text-base leading-7">This quick form is for medical students. You can still update your details on your full profile.</p>
        <Link href="/account/profile" className="mt-7 inline-flex rounded-full bg-midnight px-6 py-3 font-semibold text-white">Open my profile</Link>
      </main>
    );
  }

  const savedDestination = `/whats-new?${new URLSearchParams({ profile_saved: '1', ...Object.fromEntries(campaign) })}`;
  return <GraduationYearForm destination={savedDestination} returnTo={`/account/grad-year${suffix}`} />;
}
