// Read-only. Uses local environment credentials; prints counts, never keys or rows.
import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing local Supabase configuration');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const results = [];
for (const table of ['canonical_entities', 'canonical_cards', 'external_questions']) {
  const { data, count, error } = await client.from(table).select('id', { count: 'exact' });
  results.push({ table, returnedRows: data?.length ?? null, exactCount: count, errorCode: error?.code ?? null });
}
console.log(JSON.stringify({ capturedAt: new Date().toISOString(), results }, null, 2));
