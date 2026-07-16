import type { WebEntitlementView } from '@/lib/brobot/billing-entitlement-state';

export type CheckoutSuccessPhase = 'activating' | 'active' | 'delayed' | 'guest';

export const CHECKOUT_SUCCESS_POLL_INTERVAL_MS = 1000;
export const CHECKOUT_SUCCESS_MAX_POLL_ATTEMPTS = 30;

export const CHECKOUT_SUCCESS_BENEFITS = [
  {
    title: 'Unlimited BroBot chat',
    description:
      'Ask unlimited orthopaedic questions, prep cases, and review high-yield concepts without daily caps.',
  },
  {
    title: 'Explain learning & ROCK curriculum',
    description:
      'Use BroBot across Explain learning pages and ROCK curriculum pages to find gaps and study what matters next.',
  },
  {
    title: 'Access across SnapOrtho',
    description:
      'Your Unlimited plan follows you across SnapOrtho web and supported mobile products.',
  },
] as const;

export function logCheckoutSuccess(
  event: string,
  details: Record<string, unknown> = {}
) {
  console.info(`[checkout/success] ${event}`, details);
}

export function resolveCheckoutSuccessPhase(params: {
  isAuthenticated: boolean;
  isUnlimited: boolean;
  pollTimedOut: boolean;
}): CheckoutSuccessPhase {
  if (!params.isAuthenticated) return 'guest';
  if (params.isUnlimited) return 'active';
  if (params.pollTimedOut) return 'delayed';
  return 'activating';
}

export function getCheckoutSuccessHeadline(phase: CheckoutSuccessPhase): string {
  switch (phase) {
    case 'guest':
      return 'Checkout received';
    case 'activating':
      return 'Payment received. Activating BroBot Unlimited…';
    case 'active':
      return "You're in — BroBot Unlimited is active";
    case 'delayed':
      return 'Your checkout succeeded, but activation is still syncing.';
  }
}

export type CheckoutSuccessCtaKind = 'primary' | 'secondary' | 'tertiary' | 'disabled';

export type CheckoutSuccessCta = {
  kind: CheckoutSuccessCtaKind;
  label: string;
  href?: string;
  action?: 'restore';
};

export const CHECKOUT_SUCCESS_ROUTES = {
  startChat: '/brobot/chat',
  studentWorkspace: '/work',
  manageBilling: '/account/billing',
} as const;

export function getCheckoutSuccessCtas(params: {
  phase: CheckoutSuccessPhase;
  isUnlimited: boolean;
}): CheckoutSuccessCta[] {
  if (params.phase === 'active') {
    return [
      {
        kind: 'primary',
        label: 'Start chatting with BroBot',
        href: CHECKOUT_SUCCESS_ROUTES.startChat,
      },
      {
        kind: 'secondary',
        label: 'Go to Student Workspace',
        href: CHECKOUT_SUCCESS_ROUTES.studentWorkspace,
      },
      {
        kind: 'tertiary',
        label: 'Manage billing',
        href: CHECKOUT_SUCCESS_ROUTES.manageBilling,
      },
    ];
  }

  if (params.phase === 'delayed') {
    const ctas: CheckoutSuccessCta[] = [
      { kind: 'primary', label: 'Restore Subscription', action: 'restore' },
      {
        kind: 'secondary',
        label: 'Go to billing',
        href: CHECKOUT_SUCCESS_ROUTES.manageBilling,
      },
    ];

    if (params.isUnlimited) {
      ctas.push({
        kind: 'secondary',
        label: 'Start chatting with BroBot',
        href: CHECKOUT_SUCCESS_ROUTES.startChat,
      });
    }

    return ctas;
  }

  return [];
}

export function getCheckoutSuccessStatusBadgeLabel(
  badge: ReturnType<typeof getCheckoutSuccessStatusBadge>
): string | null {
  switch (badge) {
    case 'trial':
      return 'Trial active';
    case 'active':
      return 'Active';
    case 'processing':
      return 'Activating…';
    case 'delayed':
      return 'Sync delayed';
    default:
      return null;
  }
}

export function getCheckoutSuccessSubtext(phase: CheckoutSuccessPhase): string {
  switch (phase) {
    case 'guest':
      return 'Create or sign in to your SnapOrtho account to finish activating BroBot Unlimited.';
    case 'activating':
      return 'We are confirming your subscription now. This usually takes a few seconds.';
    case 'active':
      return 'You now have unlimited BroBot access across SnapOrtho.';
    case 'delayed':
      return 'Your checkout succeeded, but activation is still syncing. You will not be charged twice.';
  }
}

export function getCheckoutSuccessStatusBadge(
  phase: CheckoutSuccessPhase,
  status: string | null
): 'trial' | 'active' | 'processing' | 'delayed' | null {
  if (phase === 'activating') return 'processing';
  if (phase === 'delayed') return 'delayed';
  if (phase !== 'active') return null;
  if (status === 'trialing') return 'trial';
  return 'active';
}

export function shouldShowCheckoutBenefitCards(phase: CheckoutSuccessPhase): boolean {
  return phase === 'active';
}

export function shouldShowCheckoutFreeQuota(_phase: CheckoutSuccessPhase): boolean {
  void _phase;
  return false;
}

export function summarizeEntitlementPollResult(
  view: WebEntitlementView | null
): Record<string, unknown> {
  if (!view) {
    return { access: null, isUnlimited: false, status: null };
  }

  return {
    access: view.access,
    isUnlimited: view.isUnlimited,
    status: view.status,
    provider: view.entitlement?.provider ?? null,
    planCode: view.entitlement?.planCode ?? null,
  };
}

export function buildCheckoutSuccessReturnPath(sessionId: string | null, returnTo?: string) {
  const params = new URLSearchParams();
  if (sessionId) {
    params.set('session_id', sessionId);
  }
  if (returnTo && returnTo !== '/brobot/chat') {
    params.set('return_to', returnTo);
  }
  const query = params.toString();
  return query ? `/checkout/success?${query}` : '/checkout/success';
}
