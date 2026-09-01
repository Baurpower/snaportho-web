export class SubscriptionOwnerConflictError extends Error {
  constructor(message = 'A provider subscription cannot be reassigned to another user.') {
    super(message);
    this.name = 'SubscriptionOwnerConflictError';
  }
}

export function isSubscriptionOwnerConflict(
  error: { code?: string | null; message?: string | null; details?: string | null } | null | undefined
) {
  if (!error) return false;

  const code = error.code ?? '';
  const message = `${error.message ?? ''} ${error.details ?? ''}`;
  return (
    message.includes('subscription_owner_conflict') ||
    (code === 'P0001' && message.toLowerCase().includes('cannot be reassigned'))
  );
}

export type PendingSubscriptionClaimGate =
  | {
      action: 'reject';
      result:
        | { status: 'already_claimed_by_user'; subscriptionId: string; pendingId: string }
        | { status: 'not_claimable'; reason: string };
    }
  | { action: 'resume' }
  | { action: 'reserve' };

export function evaluatePendingSubscriptionClaimGate(params: {
  userId: string;
  pending: {
    id: string;
    claimed_at: string | null;
    claimed_by_user_id: string | null;
    stripe_subscription_id: string;
  };
}): PendingSubscriptionClaimGate {
  const { userId, pending } = params;

  if (pending.claimed_by_user_id === userId && pending.claimed_at) {
    return {
      action: 'reject',
      result: {
        status: 'already_claimed_by_user',
        subscriptionId: pending.stripe_subscription_id,
        pendingId: pending.id,
      },
    };
  }

  if (pending.claimed_at) {
    return {
      action: 'reject',
      result: { status: 'not_claimable', reason: 'already_claimed' },
    };
  }

  if (pending.claimed_by_user_id && pending.claimed_by_user_id !== userId) {
    return {
      action: 'reject',
      result: { status: 'not_claimable', reason: 'reserved_by_another_account' },
    };
  }

  if (pending.claimed_by_user_id === userId) {
    return { action: 'resume' };
  }

  return { action: 'reserve' };
}
