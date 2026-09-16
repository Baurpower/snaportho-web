'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function GraduationYearForm({ destination, returnTo }: { destination: string; returnTo: string }) {
  const router = useRouter();
  const [year, setYear] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const parsed = Number(year);
    if (!/^\d{4}$/.test(year) || !Number.isInteger(parsed) || parsed < 1900 || parsed > 2100) {
      setError('Enter a four-digit graduation year.');
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setSaving(false);
      router.replace(`/auth/sign-in?${new URLSearchParams({ redirectTo: returnTo })}`);
      return;
    }

    const { data, error: saveError } = await supabase.from('user_profiles')
      .update({ grad_year: parsed, is_profile_complete: true })
      .eq('user_id', user.id)
      .eq('training_level', 'MD/DO Student')
      .select('user_id')
      .maybeSingle();

    if (saveError || !data) {
      setError('We couldn’t save that yet. Please try again, or update your full profile.');
      setSaving(false);
      return;
    }

    router.replace(destination);
  }

  return (
    <main className="min-h-[70vh] bg-[#f7f2e9] px-5 pb-20 pt-24 text-[#11162f] sm:pt-32">
      <div className="mx-auto max-w-lg overflow-hidden rounded-[2rem] border border-[#11162f]/10 bg-white shadow-[0_25px_70px_rgba(17,22,47,0.1)]">
        <div className="border-b border-[#11162f]/10 px-7 py-7 sm:px-10">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#426b9b]">One quick update</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">What year do you graduate?</h1>
          <p className="mt-3 text-base leading-7 text-[#414960]">Add your medical school graduation year, then take a look at what’s new in SnapOrtho.</p>
        </div>
        <form onSubmit={save} className="space-y-5 px-7 py-8 sm:px-10">
          <div>
            <label htmlFor="graduation-year" className="block text-base font-semibold">Medical school graduation year</label>
            <input id="graduation-year" name="graduation-year" type="number" inputMode="numeric" min="1900" max="2100" required autoComplete="off" placeholder="e.g. 2028" value={year} onChange={(event) => setYear(event.target.value)} aria-describedby={error ? 'graduation-year-error' : undefined} className="mt-3 min-h-14 w-full rounded-xl border border-[#11162f]/25 px-4 text-lg outline-none focus:border-[#426b9b] focus:ring-4 focus:ring-[#a3cfff]/40" />
          </div>
          {error && <p id="graduation-year-error" role="alert" className="text-sm font-medium text-red-700">{error}</p>}
          <button type="submit" disabled={saving} className="min-h-14 w-full rounded-xl bg-[#11162f] px-6 py-3 text-base font-bold text-white transition hover:bg-[#22325a] focus:outline-none focus:ring-4 focus:ring-[#a3cfff] disabled:cursor-wait disabled:opacity-60">{saving ? 'Saving…' : 'Save and see what’s new'}</button>
          <p className="text-center text-sm text-[#596078]">Just one field. No other profile details needed.</p>
        </form>
      </div>
    </main>
  );
}
