import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Brain, Download } from 'lucide-react';

export const metadata: Metadata = {
  title: 'What’s new in SnapOrtho',
  description: 'Try BroBot or download the SnapOrtho Anki add-on.',
  robots: { index: false, follow: false },
};

const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;

export default async function WhatsNewPage({
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
  const profileSaved = params.profile_saved === '1';

  return (
    <main className="min-h-[75vh] bg-[#f7f2e9] px-5 pb-20 pt-24 text-[#11162f] sm:pt-32">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#426b9b]">{profileSaved ? 'You’re all set' : 'What’s new'}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Where do you want to start?</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[#414960]">{profileSaved ? 'Thanks for adding your graduation year. ' : ''}Here are two things I’ve been working on that I think you’ll like.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <section className="flex flex-col rounded-[1.7rem] border border-[#11162f]/10 bg-white p-7 shadow-[0_18px_50px_rgba(17,22,47,0.08)] sm:p-9">
            <Brain className="h-9 w-9 text-[#426b9b]" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-black">Ask BroBot</h2>
            <p className="mt-3 flex-1 text-base leading-7 text-[#414960]">Bring a question from a case, rotation, or study session. BroBot can help you work through the anatomy, approach, or classification.</p>
            <Link href={`/brobot/chat${suffix}`} className="mt-8 inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#11162f] px-6 py-3 font-bold text-white hover:bg-[#22325a] focus:outline-none focus:ring-4 focus:ring-[#a3cfff]">Try BroBot <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
          </section>
          <section className="flex flex-col rounded-[1.7rem] border border-[#11162f]/10 bg-white p-7 shadow-[0_18px_50px_rgba(17,22,47,0.08)] sm:p-9">
            <Download className="h-9 w-9 text-[#426b9b]" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-black">Study with Anki</h2>
            <p className="mt-3 flex-1 text-base leading-7 text-[#414960]">Get the SnapOrtho Anki add-on and orthopaedic master deck for your next study session.</p>
            <Link href={`/anki/download${suffix}`} className="mt-8 inline-flex min-h-13 items-center justify-center gap-2 rounded-full border-2 border-[#11162f] px-6 py-3 font-bold text-[#11162f] hover:bg-[#eef6ff] focus:outline-none focus:ring-4 focus:ring-[#a3cfff]">Download the Anki add-on <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
          </section>
        </div>
      </div>
    </main>
  );
}
