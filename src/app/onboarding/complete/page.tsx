'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const IOS_SCHEME_URL = 'snaportho://auth/login';
const ANDROID_SCHEME_URL = 'snaportho://';
const IOS_STORE = 'https://apps.apple.com/app/id1234567890';
const ANDROID_STORE = 'https://play.google.com/store/apps/details?id=com.snaportho.app';

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function openInApp() {
  const schemeUrl = isIOS() ? IOS_SCHEME_URL : ANDROID_SCHEME_URL;
  const storeUrl = isIOS() ? IOS_STORE : ANDROID_STORE;

  const now = Date.now();

  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = schemeUrl;
  document.body.appendChild(iframe);

  setTimeout(() => {
    const elapsed = Date.now() - now;
    if (elapsed < 1500) {
      window.location.href = storeUrl;
    }
    try { document.body.removeChild(iframe); } catch {}
  }, 1000);
}

export default function OnboardingCompletePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/learn');
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
        <h1 className="text-3xl font-bold text-navy">You’re All Set!</h1>
        <p className="text-midnight/80 text-lg">
          Thanks for completing your profile. SnapOrtho is ready to help you learn smarter, faster,
          and with more confidence.
        </p>

        <button
          type="button"
          onClick={openInApp}
          className="w-full px-8 py-4 text-lg bg-sky text-white rounded-full font-semibold hover:bg-sky/90 transition shadow-lg"
        >
          Continue to App
        </button>
        <p className="text-xs text-midnight/60">
          Don’t have the app? We’ll send you to the store if it’s not installed.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <button
            onClick={() => router.push('/learn')}
            className="flex-1 px-6 py-3 bg-sky text-white rounded-full font-medium hover:bg-sky/90 transition"
          >
            Learn Home
          </button>

          <button
            onClick={() => router.push('/brobot')}
            className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-full font-medium hover:bg-teal-600/90 transition"
          >
            BroBot
          </button>
        </div>
      </div>
    </main>
  );
}
