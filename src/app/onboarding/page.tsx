export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import OnboardingFormClient from "@/components/onboardingformclient";

export default async function OnboardingPage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/auth/sign-in?redirectTo=/onboarding");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <OnboardingFormClient initialSession={session} />
    </main>
  );
}