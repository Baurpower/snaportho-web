import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export function getRequiredBearerToken(request: Request) {
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!authHeader?.toLowerCase().startsWith('bearer ')) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  return token.length > 0 ? token : null;
}

export async function getMobileBearerUser(request: Request) {
  const bearerToken = getRequiredBearerToken(request);
  if (!bearerToken) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Bearer authentication required' }, { status: 401 }),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(bearerToken);

  if (error || !user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }

  return { user, response: null };
}
