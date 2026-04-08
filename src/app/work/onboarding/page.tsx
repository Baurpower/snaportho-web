// src/app/work/onboarding/page.tsx
import WorkspaceOnboardingClient from "./workspaceonboardingclient";

type PageProps = {
  searchParams?: Promise<{
    redirectTo?: string;
  }>;
};

export default async function WorkspaceOnboardingPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const redirectTo = params?.redirectTo || "/work";

  return <WorkspaceOnboardingClient redirectTo={redirectTo} />;
}