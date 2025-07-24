// hooks/useProfile.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { UserProfile } from '@/app/onboarding/profileform';

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) return;

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        setError(error);
      }

      setProfile(data ?? {});
      setLoading(false);
    };

    loadProfile();
  }, [userId]);

  return { profile, loading, error };
}
