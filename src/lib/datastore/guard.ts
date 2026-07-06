export type DatastoreProvider = 'supabase' | 'rds' | 'unknown';

export type DatastoreGuardContext = {
  operation: string;
  table?: string;
  route?: string;
};

let loggedPrimaryDatastore = false;

function resolveConfiguredProvider(): DatastoreProvider {
  const postgresHost = process.env.POSTGRES_HOST?.trim() ?? '';
  if (postgresHost.includes('rds.amazonaws.com')) {
    return 'rds';
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? process.env.SUPABASE_URL?.trim() ?? '';
  if (supabaseUrl.includes('supabase.co')) {
    return 'supabase';
  }

  return 'unknown';
}

/** Logs once per process which primary datastore env points at. */
export function logPrimaryDatastoreOnce() {
  if (loggedPrimaryDatastore) return;
  loggedPrimaryDatastore = true;

  const provider = resolveConfiguredProvider();
  const hasDeadRdsEnv = Boolean(process.env.POSTGRES_HOST?.includes('rds.amazonaws.com'));

  console.log('[datastore] primary_provider', {
    provider,
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL),
    deadRdsEnvPresent: hasDeadRdsEnv,
    note: hasDeadRdsEnv
      ? 'POSTGRES_* env vars are present but unused by app code; remove before RDS shutdown'
      : undefined,
  });

  if (hasDeadRdsEnv && process.env.NODE_ENV === 'production') {
    console.warn('[datastore] dead_rds_env_in_production', {
      message: 'POSTGRES_HOST is set in production but no runtime code reads it. Remove from secrets.',
    });
  }
}

/** Structured log for datastore operations (grep-friendly in production). */
export function logDatastoreOperation(context: DatastoreGuardContext) {
  console.log('[datastore] operation', {
    provider: 'supabase',
    ...context,
  });
}