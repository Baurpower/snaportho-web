export type BillingUserLike = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  is_anonymous?: boolean;
};

export type ClaimableBillingUserReason =
  | 'anonymous_account'
  | 'email_missing'
  | 'email_unconfirmed';

export type ClaimableBillingUserResult =
  | { ok: true; user: { id: string; email: string } }
  | { ok: false; reason: ClaimableBillingUserReason };

export function getClaimableBillingUser(user: BillingUserLike): ClaimableBillingUserResult {
  if (user.is_anonymous === true) {
    return { ok: false, reason: 'anonymous_account' };
  }

  const email = user.email?.trim() ?? '';
  if (!email) {
    return { ok: false, reason: 'email_missing' };
  }

  if (!user.email_confirmed_at) {
    return { ok: false, reason: 'email_unconfirmed' };
  }

  return { ok: true, user: { id: user.id, email } };
}

export function claimableBillingUserHttpError(reason: ClaimableBillingUserReason) {
  switch (reason) {
    case 'anonymous_account':
      return {
        status: 403 as const,
        error: 'Sign in with a full account to activate this subscription.',
        reason,
      };
    case 'email_missing':
      return {
        status: 403 as const,
        error: 'A verified email is required to activate this subscription.',
        reason,
      };
    case 'email_unconfirmed':
      return {
        status: 403 as const,
        error: 'Confirm your email to activate this subscription.',
        reason,
      };
  }
}
