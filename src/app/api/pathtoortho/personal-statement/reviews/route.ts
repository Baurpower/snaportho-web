import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PERSONAL_STATEMENT_SCHEMA_VERSION } from '@/lib/brobot/personal-statement/types';
import { getBroBotAccessGate } from '@/lib/brobot/brobot-entitlement-access';
import { BROBOT_CONFIG } from '@/lib/config/brobot';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ reviews: [] });
  const gate = await getBroBotAccessGate({ type: 'user', id: user.id });
  const limit = gate.isUnlimited ? BROBOT_CONFIG.PS_PAID_HISTORY_LIMIT : BROBOT_CONFIG.PS_FREE_HISTORY_LIMIT;
  const { data, error } = await supabase.from('personal_statement_reviews').select('id,source_type,original_filename,statement_hash,word_count,model,prompt_version,review_schema_version,review_json,created_at').eq('user_id', user.id).eq('status', 'completed').eq('review_schema_version', PERSONAL_STATEMENT_SCHEMA_VERSION).order('created_at', { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: 'analysis_failed', message: 'Saved reviews are temporarily unavailable.' }, { status: 500 });
  return NextResponse.json({ reviews: data, comparisonAllowed: gate.isUnlimited || !BROBOT_CONFIG.PS_COMPARISON_PAID_ONLY, historyLimit: limit });
}
