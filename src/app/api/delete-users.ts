import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body as { email: string; password: string };

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 1) sign in to verify credentials
  const { data, error: signInError } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (signInError || !data.session) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // 2) delete user by their ID
  const userId = data.user.id;
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return res.status(500).json({ error: 'Failed to delete user' });
  }

  res.status(200).json({ success: true });
}
