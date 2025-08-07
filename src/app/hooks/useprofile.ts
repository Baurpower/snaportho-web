// hooks/useProfile.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { UserProfile } from '@/components/profileform';

// Define a fallback/default user profile shape
const defaultProfile: UserProfile = {
  full_name: '',
  bio: '',
  institution: '',
  training_level: '',
};

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) return;

    const loadProfile = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        setError(error);
        setProfile(defaultProfile); // fallback on error
      } else {
        setProfile(data ?? defaultProfile);
      }

      setLoading(false);
    };

    loadProfile();
  }, [userId]);

  return { profile, loading, error };
}
