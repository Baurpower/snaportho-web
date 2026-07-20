import { NextResponse } from 'next/server';

import { createClient as createServerSupabaseClient } from '@/utils/supabase/server';

function bearerToken(request: Request) {
  const header = request.headers.get('authorization');
  return header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ messageId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const token = bearerToken(request);
  const { data: { user } } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { messageId } = await context.params;
  const { data, error } = await supabase
    .from('brobot_messages')
    .select('structured_json')
    .eq('id', messageId)
    .eq('user_id', user.id)
    .eq('role', 'assistant')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Unable to load enrichment.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });

  const structured = (data.structured_json ?? {}) as Record<string, unknown>;
  const enrichment = (structured.enrichment ?? { status: 'pending' }) as Record<string, unknown>;
  return NextResponse.json({
    status: enrichment.status ?? 'pending',
    suggestedQuestions: structured.suggestedQuestions ?? [],
    nextLearningBranches: structured.nextLearningBranches ?? [],
    tags: structured.tags ?? [],
    enrichment,
  });
}
