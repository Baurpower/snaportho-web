export type BranchServerEvent = {
  name: 'START_TRIAL' | 'SUBSCRIBE' | 'PURCHASE';
  userId: string;
  transactionId: string;
  idempotencyKey?: string;
  revenue?: number | null;
  currency?: string | null;
  customData?: Record<string, string | number | boolean | null>;
  userData?: { os?: string; os_version?: string; idfv?: string };
};

export function branchUserDataFromStripeMetadata(
  metadata: Record<string, string | null | undefined> | null | undefined
): BranchServerEvent['userData'] {
  const idfv = metadata?.branch_idfv?.trim();
  const osVersion = metadata?.branch_os_version?.trim();
  if (!idfv && !osVersion) return undefined;
  return {
    os: 'iOS',
    os_version: osVersion || undefined,
    idfv: /^[0-9a-f-]{36}$/i.test(idfv ?? '') ? idfv : undefined,
  };
}

export async function sendBranchServerEvent(event: BranchServerEvent): Promise<boolean> {
  const branchKey = process.env.BRANCH_KEY ?? process.env.NEXT_PUBLIC_BRANCH_KEY;
  if (!branchKey || process.env.NODE_ENV === 'test') return false;
  try {
    const response = await fetch('https://api2.branch.io/v2/event/standard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branch_key: branchKey,
        name: event.name,
        customer_event_alias: event.idempotencyKey ?? event.transactionId,
        transaction_id: event.transactionId,
        revenue: event.revenue ?? undefined,
        currency: event.currency ?? undefined,
        user_data: { developer_identity: event.userId, ...event.userData },
        custom_data: { product: 'brobot', ...event.customData },
      }),
    });
    if (!response.ok) {
      console.error('[branch/server] event failed', { name: event.name, status: response.status });
      return false;
    }
    return true;
  } catch (error) {
    console.error('[branch/server] event unavailable', { name: event.name, error });
    return false;
  }
}
