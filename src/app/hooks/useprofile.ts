// hooks/useProfile.ts
'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserProfile } from '@/components/profileform';
import { createClient } from '@/utils/supabase/client';

// Define a fallback/default user profile shape
const defaultProfile: UserProfile = {
  full_name: '',
  bio: '',
  institution: '',
  training_level: '',
};

export function useProfile(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!userId) {
        if (isMounted) {
          setProfile(defaultProfile);
          setLoading(false);
          setError(null);
        }
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.error('Error loading profile:', error);
        setError(error);
        setProfile(defaultProfile);
      } else {
        setProfile(data ?? defaultProfile);
      }

      setLoading(false);
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [userId, supabase]);

  return { profile, loading, error };
}