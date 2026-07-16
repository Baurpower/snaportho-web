import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized', message: 'Sign in to open saved reviews.' }, { status: 401 });
  const { data } = await supabase.from('personal_statement_reviews').select('*').eq('id', id).eq('user_id', user.id).single();
  if (!data) return NextResponse.json({ error: 'review_not_found', message: 'That saved review was not found.' }, { status: 404 });
  return NextResponse.json({ review: data });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized', message: 'Sign in to delete saved reviews.' }, { status: 401 });
  const { error, count } = await supabase.from('personal_statement_reviews').delete({ count: 'exact' }).eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'analysis_failed', message: 'The saved review could not be deleted.' }, { status: 500 });
  if (!count) return NextResponse.json({ error: 'review_not_found', message: 'That saved review was not found.' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
