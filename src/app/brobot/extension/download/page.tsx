import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDownToLine, ArrowRight, CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import extensionManifest from '../../../../../extensions/orthobullets-brobot/manifest.template.json';

const version = extensionManifest.version;
const downloadUrl = `/downloads/snaportho-brobot-${version}.zip`;

export const metadata: Metadata = {
  title: 'Download the BroBot Chrome Extension',
  description: 'Download BroBot for Chrome and use its side panel while studying on supported Orthobullets and AAOS pages.',
  alternates: { canonical: '/brobot/extension/download' },
};

const steps = [
  { title: 'Download and unzip', body: 'Save the BroBot ZIP, then extract it to a folder you will keep on your computer.' },
  { title: 'Open Chrome extensions', body: 'Go to chrome://extensions in Chrome and turn on Developer mode in the upper right.' },
  { title: 'Load the folder', body: 'Choose Load unpacked and select the extracted folder that contains manifest.json.' },
  { title: 'Connect your account', body: 'Open an Orthobullets or supported AAOS page, click the BroBot icon, and choose Link to SnapOrtho.' },
];

export default function ExtensionDownloadPage() {
  return (
    <main className="min-h-screen bg-[#f6f1e7] text-[#11162f]">
      <section className="relative overflow-hidden bg-[#0b1025] px-5 pb-20 pt-32 text-white sm:px-8 lg:pb-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_25%,rgba(45,212,191,0.2),transparent_34%),radial-gradient(circle_at_10%_90%,rgba(255,210,90,0.13),transparent_35%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <Link href="/brobot/landing" className="text-sm font-bold text-teal-200 hover:underline">← BroBot</Link>
            <p className="mt-8 text-xs font-black uppercase tracking-[0.2em] text-teal-200">BroBot for Chrome</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-black leading-tight tracking-tight sm:text-6xl">Study with BroBot beside the question.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
              Get explanations and topic tutoring in a Chrome side panel while you study on supported Orthobullets and AAOS pages.
            </p>
            <a href={downloadUrl} download className="mt-9 inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#ffda70] px-7 py-4 text-base font-black text-[#11162f] shadow-lg transition hover:bg-[#ffe6a2] focus:outline-none focus:ring-4 focus:ring-white/40">
              <ArrowDownToLine className="h-5 w-5" aria-hidden="true" /> Download for Chrome
            </a>
            <p className="mt-3 text-sm text-white/60">Version {version} · ZIP for manual installation · Chrome desktop</p>
          </div>
          <div className="rounded-[2rem] border border-white/15 bg-white/[0.08] p-6 shadow-2xl backdrop-blur sm:p-8">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white p-2">
                <Image src="/brologo.png" alt="" width={54} height={54} className="h-12 w-12 object-contain" />
              </div>
              <div><p className="text-xl font-black">BroBot Question Tutor</p><p className="text-sm text-white/60">A study companion in your side panel</p></div>
            </div>
            <div className="mt-8 space-y-5">
              {['Explain questions after you answer or enter review', 'Quiz yourself while reading supported topics', 'Link securely to your SnapOrtho account'].map((feature) => (
                <div key={feature} className="flex gap-3 text-sm leading-6 text-white/85"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-200" aria-hidden="true" />{feature}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">Setup</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Install in four steps</h2>
          <p className="mt-4 leading-7 text-[#596078]">Chrome currently requires a manual install for a ZIP downloaded from this site. Keep the extracted folder in place after loading it.</p>
        </div>
        <ol className="mt-9 grid gap-4 md:grid-cols-2">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-3xl border border-[#11162f]/10 bg-white p-6 shadow-sm sm:p-7">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#11162f] text-sm font-black text-white">{index + 1}</span>
              <h3 className="mt-5 text-xl font-black">{step.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[#596078]">{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-[#a7d8cf] bg-[#e9f7f3] p-6 sm:flex-row sm:items-start sm:p-8">
          <ShieldCheck className="h-7 w-7 shrink-0 text-[#0f766e]" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-black">You control when a question is sent</h2>
            <p className="mt-2 text-sm leading-7 text-[#405c5a]">The extension reads supported pages to show study context. Question content is sent to BroBot only when you request an explanation or tutoring. Your SnapOrtho password stays on the website during account linking.</p>
            <Link href="/privacy" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#0f766e] hover:underline">Read the privacy policy <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </div>
        <p className="mt-8 text-sm leading-7 text-[#596078]">Manual installs do not update automatically. For a new version, download the new ZIP, replace the extracted files, and reload the extension in Chrome. For help, <Link href="/contact" className="font-bold text-[#0f766e] hover:underline">contact SnapOrtho</Link>. <a href="https://developer.chrome.com/docs/extensions/how-to/distribute" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-[#0f766e] hover:underline">About Chrome extension distribution <ExternalLink className="h-3 w-3" aria-hidden="true" /></a></p>
      </section>
    </main>
  );
}
