import { createHash, X509Certificate } from 'node:crypto';

import { SignJWT, decodeProtectedHeader, importPKCS8, jwtVerify } from 'jose';

import { createAdminClient } from '@/lib/supabase/admin';
import { BROBOT_CONFIG } from '@/lib/config/brobot';
import { upsertCanonicalSubscription } from '@/lib/subscriptions/ledger';

const APPLE_ROOT_CA_G3_PEM = `-----BEGIN CERTIFICATE-----
MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS
QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u
IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN
MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS
b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y
aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49
AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf
TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517
IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr
MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA
MGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4
at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM
6BgD56KyKA==
-----END CERTIFICATE-----`;

const APPLE_ROOT_CA_G3_FINGERPRINT256 = new X509Certificate(APPLE_ROOT_CA_G3_PEM).fingerprint256;

export type AppleEnvironment = 'sandbox' | 'production';

export type AppleNotificationType =
  | 'SUBSCRIBED'
  | 'DID_RENEW'
  | 'EXPIRED'
  | 'DID_FAIL_TO_RENEW'
  | 'GRACE_PERIOD'
  | 'REFUND'
  | 'REVOKE'
  | 'DID_CHANGE_RENEWAL_STATUS'
  | 'DID_CHANGE_RENEWAL_PREF'
  | 'TEST'
  | string;

export type AppleTransactionInfo = {
  transactionId?: string;
  originalTransactionId?: string;
  productId?: string;
  purchaseDate?: number;
  expiresDate?: number;
  revocationDate?: number;
  environment?: string;
  appAccountToken?: string;
};

export type AppleRenewalInfo = {
  originalTransactionId?: string;
  autoRenewProductId?: string;
  autoRenewStatus?: number | boolean;
  gracePeriodExpiresDate?: number;
};

export type AppleNotificationPayload = {
  notificationUUID?: string;
  notificationType?: AppleNotificationType;
  subtype?: string;
  data?: {
    appAppleId?: number;
    bundleId?: string;
    environment?: string;
    signedRenewalInfo?: string;
    signedTransactionInfo?: string;
  };
};

export type VerifiedAppleNotification = {
  notification: AppleNotificationPayload;
  signedPayload: string;
  transactionInfo: AppleTransactionInfo | null;
  renewalInfo: AppleRenewalInfo | null;
};

export type VerifiedAppleTransaction = {
  transactionInfo: AppleTransactionInfo;
  signedTransactionInfo: string;
  environment: AppleEnvironment;
};

export type AppleSubscriptionStatusResponse = {
  environment: AppleEnvironment;
  raw: Record<string, unknown>;
  lastTransactions: Array<{
    status: number;
    originalTransactionId: string | null;
    signedTransactionInfo: string | null;
    signedRenewalInfo: string | null;
    transactionInfo: AppleTransactionInfo | null;
    renewalInfo: AppleRenewalInfo | null;
  }>;
};

export class AppleVerificationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'AppleVerificationError';
    if (options && 'cause' in options) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

type AppleSubscriptionStatus = 'active' | 'grace' | 'billing_retry' | 'canceled' | 'expired';

type AppleSubscriptionState = {
  status: AppleSubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  productId: string | null;
  environment: AppleEnvironment;
};

function normalizeAppleEnvironment(value: string | null | undefined): AppleEnvironment {
  return value?.toLowerCase() === 'sandbox' ? 'sandbox' : 'production';
}

export function normalizeApplePrivateKey(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes('BEGIN PRIVATE KEY')) {
    return trimmed.replace(/\\n/g, '\n');
  }

  const normalized = trimmed.replace(/\s+/g, '');
  const wrapped = normalized.match(/.{1,64}/g)?.join('\n') ?? normalized;
  return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`;
}

function derToPem(base64Der: string, label: 'CERTIFICATE') {
  const wrapped = base64Der.match(/.{1,64}/g)?.join('\n') ?? base64Der;
  return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----`;
}

function parseAppleCertDate(value: string): number {
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) {
    throw new Error(`Unable to parse Apple certificate date: ${value}`);
  }
  return ts;
}

function assertAppleCertificateChain(x5c: string[]) {
  if (!Array.isArray(x5c) || x5c.length === 0) {
    throw new Error('Apple JWS missing x5c certificate chain');
  }

  const now = Date.now();
  const certs = x5c.map((entry) => new X509Certificate(derToPem(entry, 'CERTIFICATE')));
  const trustedRoot = new X509Certificate(APPLE_ROOT_CA_G3_PEM);

  for (const cert of certs) {
    const validFrom = parseAppleCertDate(cert.validFrom);
    const validTo = parseAppleCertDate(cert.validTo);
    if (now < validFrom || now > validTo) {
      throw new Error(`Apple signing certificate is outside its validity window: ${cert.subject}`);
    }
  }

  for (let i = 0; i < certs.length - 1; i += 1) {
    if (!certs[i].verify(certs[i + 1].publicKey)) {
      throw new Error('Apple signing certificate chain verification failed');
    }
  }

  const terminalCert = certs[certs.length - 1];
  if (terminalCert.fingerprint256 === APPLE_ROOT_CA_G3_FINGERPRINT256) {
    return certs[0];
  }

  if (
    terminalCert.issuer !== trustedRoot.subject ||
    !terminalCert.verify(trustedRoot.publicKey) ||
    trustedRoot.fingerprint256 !== APPLE_ROOT_CA_G3_FINGERPRINT256
  ) {
    throw new Error('Apple signing certificate chain is not anchored to Apple Root CA - G3');
  }

  return certs[0];
}

async function verifyAndDecodeAppleJws<T>(signedJws: string): Promise<T> {
  try {
    const header = decodeProtectedHeader(signedJws);
    if (header.alg !== 'ES256') {
      throw new AppleVerificationError(`Unexpected Apple JWS algorithm: ${String(header.alg)}`);
    }

    const leafCert = assertAppleCertificateChain(Array.isArray(header.x5c) ? header.x5c : []);
    const { payload } = await jwtVerify(signedJws, leafCert.publicKey, {
      algorithms: ['ES256'],
    });

    return payload as T;
  } catch (error) {
    if (error instanceof AppleVerificationError) {
      throw error;
    }
    throw new AppleVerificationError(
      error instanceof Error ? error.message : 'Apple JWS verification failed',
      { cause: error }
    );
  }
}

function getRequiredAppleEnv() {
  const issuerId = process.env.APPLE_ISSUER_ID?.trim();
  const keyId = process.env.APPLE_KEY_ID?.trim();
  const privateKeyRaw = process.env.APPLE_PRIVATE_KEY?.trim();
  const bundleId = process.env.APPLE_BUNDLE_ID?.trim();

  if (!issuerId || !keyId || !privateKeyRaw || !bundleId) {
    throw new Error('Missing Apple App Store Server API environment variables');
  }

  return {
    issuerId,
    keyId,
    privateKeyPem: normalizeApplePrivateKey(privateKeyRaw),
    bundleId,
  };
}

async function createAppleApiToken() {
  const { issuerId, keyId, privateKeyPem, bundleId } = getRequiredAppleEnv();
  const privateKey = await parseApplePrivateKeyForSigning(privateKeyPem);

  return new SignJWT({ bid: bundleId })
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
    .setIssuer(issuerId)
    .setAudience('appstoreconnect-v1')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

export async function parseApplePrivateKeyForSigning(rawPrivateKey: string) {
  try {
    return await importPKCS8(normalizeApplePrivateKey(rawPrivateKey), 'ES256');
  } catch (error) {
    throw new AppleVerificationError(
      error instanceof Error ? `Failed to parse Apple private key: ${error.message}` : 'Failed to parse Apple private key',
      { cause: error }
    );
  }
}

function getAppleApiBaseUrl(environment: AppleEnvironment) {
  return environment === 'sandbox'
    ? 'https://api.storekit-sandbox.itunes.apple.com'
    : 'https://api.storekit.itunes.apple.com';
}

function buildAppleApiHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
}

export function isAppleServerConfigured() {
  return Boolean(
    process.env.APPLE_ISSUER_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY &&
    process.env.APPLE_BUNDLE_ID
  );
}

export async function verifyAppStoreServerNotification(signedPayload: string): Promise<VerifiedAppleNotification> {
  const notification = await verifyAndDecodeAppleJws<AppleNotificationPayload>(signedPayload);

  const signedTransactionInfo = notification.data?.signedTransactionInfo;
  const signedRenewalInfo = notification.data?.signedRenewalInfo;

  const transactionInfo = signedTransactionInfo
    ? await verifyAndDecodeAppleJws<AppleTransactionInfo>(signedTransactionInfo)
    : null;

  const renewalInfo = signedRenewalInfo
    ? await verifyAndDecodeAppleJws<AppleRenewalInfo>(signedRenewalInfo)
    : null;

  return {
    notification,
    signedPayload,
    transactionInfo,
    renewalInfo,
  };
}

export async function fetchVerifiedAppleTransaction(
  transactionId: string,
  environmentHint?: AppleEnvironment
): Promise<VerifiedAppleTransaction> {
  if (!isAppleServerConfigured()) {
    throw new Error('Apple App Store Server API verification is not configured');
  }

  const environments: AppleEnvironment[] = environmentHint
    ? [environmentHint, environmentHint === 'sandbox' ? 'production' : 'sandbox']
    : ['production', 'sandbox'];

  const token = await createAppleApiToken();
  let lastError: Error | null = null;

  for (const environment of environments) {
    const url = `${getAppleApiBaseUrl(environment)}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: buildAppleApiHeaders(token),
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = new Error(`Apple transaction lookup failed (${environment} ${response.status}): ${errorText}`);
        continue;
      }

      const payload = (await response.json()) as { signedTransactionInfo?: string };
      if (!payload.signedTransactionInfo) {
        throw new Error(`Apple transaction lookup (${environment}) returned no signedTransactionInfo`);
      }

      const transactionInfo = await verifyAndDecodeAppleJws<AppleTransactionInfo>(payload.signedTransactionInfo);
      return {
        transactionInfo,
        signedTransactionInfo: payload.signedTransactionInfo,
        environment: normalizeAppleEnvironment(transactionInfo.environment ?? environment),
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error('Apple transaction lookup failed');
}

export async function fetchAppleSubscriptionStatus(
  originalTransactionId: string,
  environmentHint?: AppleEnvironment
): Promise<AppleSubscriptionStatusResponse> {
  if (!isAppleServerConfigured()) {
    throw new Error('Apple App Store Server API verification is not configured');
  }

  const environments: AppleEnvironment[] = environmentHint
    ? [environmentHint, environmentHint === 'sandbox' ? 'production' : 'sandbox']
    : ['production', 'sandbox'];

  const token = await createAppleApiToken();
  let lastError: Error | null = null;

  for (const environment of environments) {
    const url = `${getAppleApiBaseUrl(environment)}/inApps/v1/subscriptions/${encodeURIComponent(originalTransactionId)}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: buildAppleApiHeaders(token),
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = new Error(`Apple subscription lookup failed (${environment} ${response.status}): ${errorText}`);
        continue;
      }

      const payload = (await response.json()) as {
        data?: Array<{
          lastTransactions?: Array<{
            status?: number;
            originalTransactionId?: string;
            signedTransactionInfo?: string;
            signedRenewalInfo?: string;
          }>;
        }>;
      };

      const lastTransactions = await Promise.all(
        (payload.data ?? [])
          .flatMap((group) => group.lastTransactions ?? [])
          .map(async (item) => ({
            status: item.status ?? 0,
            originalTransactionId: item.originalTransactionId ?? null,
            signedTransactionInfo: item.signedTransactionInfo ?? null,
            signedRenewalInfo: item.signedRenewalInfo ?? null,
            transactionInfo: item.signedTransactionInfo
              ? await verifyAndDecodeAppleJws<AppleTransactionInfo>(item.signedTransactionInfo)
              : null,
            renewalInfo: item.signedRenewalInfo
              ? await verifyAndDecodeAppleJws<AppleRenewalInfo>(item.signedRenewalInfo)
              : null,
          }))
      );

      return {
        environment,
        raw: payload as Record<string, unknown>,
        lastTransactions,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error('Apple subscription lookup failed');
}

export function deriveAppleState(params: {
  transactionInfo: AppleTransactionInfo | null;
  renewalInfo?: AppleRenewalInfo | null;
  notificationType?: AppleNotificationType;
  subtype?: string | null;
  fallbackEnvironment?: AppleEnvironment;
}) {
  const { transactionInfo, renewalInfo, notificationType, subtype } = params;
  const environment = normalizeAppleEnvironment(
    transactionInfo?.environment ?? params.fallbackEnvironment ?? 'production'
  );
  const now = Date.now();
  const expiresDateMs = transactionInfo?.expiresDate ?? null;
  const revocationDateMs = transactionInfo?.revocationDate ?? null;
  const autoRenewStatus = renewalInfo?.autoRenewStatus;
  const cancelAtPeriodEnd = autoRenewStatus === 0 || autoRenewStatus === false;

  const currentPeriodEnd =
    expiresDateMs != null && Number.isFinite(expiresDateMs)
      ? new Date(expiresDateMs).toISOString()
      : null;

  const canceledAt =
    revocationDateMs != null && Number.isFinite(revocationDateMs)
      ? new Date(revocationDateMs).toISOString()
      : null;

  let status: AppleSubscriptionStatus;
  switch (notificationType) {
    case 'GRACE_PERIOD':
      status = 'grace';
      break;
    case 'DID_FAIL_TO_RENEW':
      status = 'billing_retry';
      break;
    case 'EXPIRED':
      status = 'expired';
      break;
    case 'REFUND':
    case 'REVOKE':
      status = 'canceled';
      break;
    default:
      if (revocationDateMs != null) {
        status = 'canceled';
      } else if (expiresDateMs != null && expiresDateMs > now) {
        status = 'active';
      } else if (expiresDateMs != null && expiresDateMs <= now) {
        status = 'canceled';
      } else {
        status = 'active';
      }
      break;
  }

  if (notificationType === 'DID_FAIL_TO_RENEW' && subtype === 'GRACE_PERIOD') {
    status = 'grace';
  }

  return {
    status,
    cancelAtPeriodEnd,
    currentPeriodEnd,
    canceledAt: status === 'canceled' ? canceledAt ?? new Date().toISOString() : null,
    productId:
      notificationType === 'DID_CHANGE_RENEWAL_PREF'
        ? renewalInfo?.autoRenewProductId ?? transactionInfo?.productId ?? null
        : transactionInfo?.productId ?? renewalInfo?.autoRenewProductId ?? null,
    environment,
  } satisfies AppleSubscriptionState;
}

async function resolveAppleUserId(params: {
  originalTransactionId: string;
  appAccountToken?: string;
}) {
  const supabase = createAdminClient();
  const { data: existing, error } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('provider', 'apple')
    .eq('provider_subscription_id', params.originalTransactionId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve Apple subscription owner: ${error.message}`);
  }

  if (existing?.user_id) {
    return existing.user_id;
  }

  if (params.appAccountToken && /^[0-9a-fA-F-]{36}$/.test(params.appAccountToken)) {
    return params.appAccountToken;
  }

  return null;
}

async function getAppleSubscriptionRow(originalTransactionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('user_id, provider_transaction_id, stripe_price_id, current_period_start, current_period_end, environment')
    .eq('provider', 'apple')
    .eq('provider_subscription_id', originalTransactionId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load existing Apple subscription: ${error.message}`);
  }

  return data;
}

export async function upsertAppleSubscriptionForUser(params: {
  userId: string;
  transactionInfo: AppleTransactionInfo;
  renewalInfo?: AppleRenewalInfo | null;
  notificationType?: AppleNotificationType;
  subtype?: string | null;
}) {
  if (!params.transactionInfo.originalTransactionId) {
    throw new Error('Verified Apple transaction is missing originalTransactionId');
  }

  const state = deriveAppleState({
    transactionInfo: params.transactionInfo,
    renewalInfo: params.renewalInfo,
    notificationType: params.notificationType,
    subtype: params.subtype ?? null,
  });

  const upsertPayload = {
    user_id: params.userId,
    provider: 'apple',
    environment: state.environment,
    provider_customer_id: null,
    provider_subscription_id: params.transactionInfo.originalTransactionId,
    provider_product_id: state.productId,
    provider_price_id: state.productId,
    provider_original_transaction_id: params.transactionInfo.originalTransactionId,
    provider_transaction_id: params.transactionInfo.transactionId ?? null,
    raw_provider_status: params.notificationType ?? state.status,
    provider_metadata: {
      provider: 'apple',
      notificationType: params.notificationType ?? null,
      subtype: params.subtype ?? null,
      renewalInfo: params.renewalInfo ?? null,
      transactionInfo: params.transactionInfo,
    },
    stripe_price_id: state.productId,
    plan_code: BROBOT_CONFIG.PAID_PLAN_CODE,
    status: state.status,
    current_period_start:
      params.transactionInfo.purchaseDate != null
        ? new Date(params.transactionInfo.purchaseDate).toISOString()
        : null,
    current_period_end: state.currentPeriodEnd,
    cancel_at_period_end: state.cancelAtPeriodEnd,
    canceled_at: state.canceledAt,
    last_verified_at: new Date().toISOString(),
    stripe_customer_id: null,
    stripe_subscription_id: null,
  };

  const { row: data } = await upsertCanonicalSubscription(upsertPayload);

  return { row: data, state };
}

export async function applyAppleNotificationToSubscription(params: VerifiedAppleNotification) {
  const { notification, transactionInfo, renewalInfo } = params;
  const notificationType = notification.notificationType ?? 'UNKNOWN';

  if (notificationType === 'TEST') {
    return { updated: false, reason: 'test_notification' as const };
  }

  const originalTransactionId =
    transactionInfo?.originalTransactionId ?? renewalInfo?.originalTransactionId ?? null;

  if (!originalTransactionId) {
    throw new Error('Verified Apple notification is missing originalTransactionId');
  }

  const userId = await resolveAppleUserId({
    originalTransactionId,
    appAccountToken: transactionInfo?.appAccountToken,
  });

  if (!userId) {
    throw new Error(`Unable to map Apple originalTransactionId ${originalTransactionId} to a Supabase user`);
  }

  let verifiedTransaction = transactionInfo;
  if (!verifiedTransaction?.transactionId) {
    const existingRow = await getAppleSubscriptionRow(originalTransactionId);
    if (existingRow?.provider_transaction_id) {
      const fetched = await fetchVerifiedAppleTransaction(
        existingRow.provider_transaction_id,
        normalizeAppleEnvironment(existingRow.environment)
      );
      verifiedTransaction = fetched.transactionInfo;
    } else if (existingRow) {
      verifiedTransaction = {
        transactionId: existingRow.provider_transaction_id ?? undefined,
        originalTransactionId,
        productId: existingRow.stripe_price_id ?? undefined,
        purchaseDate: existingRow.current_period_start ? Date.parse(existingRow.current_period_start) : undefined,
        expiresDate: existingRow.current_period_end ? Date.parse(existingRow.current_period_end) : undefined,
        environment: existingRow.environment ?? undefined,
      };
    }
  }

  if (!verifiedTransaction) {
    throw new Error('Verified Apple notification is missing transaction context');
  }

  if (!verifiedTransaction.expiresDate && notificationType !== 'REFUND' && notificationType !== 'REVOKE') {
    if (!verifiedTransaction.transactionId) {
      throw new Error('Verified Apple notification is missing transactionId');
    }

    const fetched = await fetchVerifiedAppleTransaction(
      verifiedTransaction.transactionId,
      normalizeAppleEnvironment(notification.data?.environment)
    );
    verifiedTransaction = fetched.transactionInfo;
  }

  const result = await upsertAppleSubscriptionForUser({
    userId,
    transactionInfo: verifiedTransaction,
    renewalInfo,
    notificationType,
    subtype: notification.subtype ?? null,
  });

  return {
    updated: true,
    userId,
    originalTransactionId,
    row: result.row,
    state: result.state,
  };
}

export async function logAppleSubscriptionEvent(params: {
  notificationUuid: string;
  notificationType: string;
  subtype?: string | null;
  originalTransactionId?: string | null;
  transactionId?: string | null;
  signedPayload: string;
  rawPayload: AppleNotificationPayload;
  processedAt?: string | null;
}) {
  const supabase = createAdminClient();
  const payloadHash = createHash('sha256').update(params.signedPayload).digest('hex');

  if (params.processedAt == null) {
    const { data: existing, error: existingError } = await supabase
      .from('apple_subscription_events')
      .select('id, notification_uuid, processed_at')
      .eq('notification_uuid', params.notificationUuid)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Failed to read Apple subscription event: ${existingError.message}`);
    }

    if (existing) {
      return existing;
    }
  }

  const { data, error } = await supabase
    .from('apple_subscription_events')
    .upsert(
      {
        notification_uuid: params.notificationUuid,
        notification_type: params.notificationType,
        subtype: params.subtype ?? null,
        original_transaction_id: params.originalTransactionId ?? null,
        transaction_id: params.transactionId ?? null,
        signed_payload: params.signedPayload,
        payload_sha256: payloadHash,
        raw_payload: params.rawPayload,
        processed_at: params.processedAt ?? null,
      },
      { onConflict: 'notification_uuid' }
    )
    .select('id, notification_uuid, processed_at')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to log Apple subscription event: ${error.message}`);
  }

  return data;
}
