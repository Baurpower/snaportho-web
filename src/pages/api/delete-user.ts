// src/pages/api/delete-user.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' })
  }

  // 1) Ensure env vars are set
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!url || !key) {
    console.error('delete-user: missing SUPABASE_SERVICE_ROLE_KEY or URL')
    return res.status(500).json({ error: 'Server misconfiguration' })
  }

  const supabaseAdmin = createClient(url, key, {
    auth: { persistSession: false },
  })

  // 2) Parse & validate body
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }

  try {
    // 3) Verify credentials
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({ email, password })
    if (signInError || !signInData.session) {
      console.error('delete-user signInError:', signInError)
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const userId = signInData.session.user.id

    // 4) Remove dependent profile row first
    const { error: delProfileErr } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('user_id', userId)
    if (delProfileErr) {
      console.error('delete-user: failed to delete user_profiles row:', delProfileErr)
      return res.status(500).json({ error: 'Database error deleting profile' })
    }

    // 5) Soft‑delete the Auth user to avoid FK conflicts
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId, true)
    if (deleteError) {
      console.error('delete-user: admin.deleteUser error:', deleteError)
      return res.status(500).json({ error: 'Database error deleting user' })
    }

    // 6) Success
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('delete-user unexpected error:', err)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
