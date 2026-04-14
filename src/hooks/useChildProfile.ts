import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { useChildStore, type ChildProfile } from '../store/childStore';

const MAX_PROFILES = 4;

export function useChildProfile() {
  const userId = useAuthStore((s) => s.currentUser?.id);
  const childProfiles = useChildStore((s) => s.childProfiles);
  const setChildProfiles = useChildStore((s) => s.setChildProfiles);
  const addProfile = useChildStore((s) => s.addProfile);
  const setSelectedChildId = useChildStore((s) => s.setSelectedChildId);

  const loadProfiles = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('child_profile')
      .select('id, name, age, gender, avatar_emoji')
      .eq('parent_id', userId)
      .order('created_at', { ascending: true });

    if (error || !data) return;

    const profiles: ChildProfile[] = data.map((row) => ({
      id: row.id,
      name: row.name,
      age: row.age,
      gender: row.gender as ChildProfile['gender'],
      avatarEmoji: row.avatar_emoji,
    }));

    setChildProfiles(profiles);

    // Auto-select the first child if none is selected yet
    const { selectedChildId } = useChildStore.getState();
    if (!selectedChildId && profiles.length > 0) {
      setSelectedChildId(profiles[0].id);
    }
  };

  const createProfile = async (
    name: string,
    age: number,
    gender: ChildProfile['gender'],
  ): Promise<{ error: string | null }> => {
    if (!userId) return { error: 'Not logged in.' };

    if (childProfiles.length >= MAX_PROFILES) {
      return { error: `You can have at most ${MAX_PROFILES} child profiles.` };
    }

    const { data, error } = await supabase
      .from('child_profile')
      .insert({ parent_id: userId, name, age, gender, avatar_emoji: '😊' })
      .select('id, name, age, gender, avatar_emoji')
      .single();

    if (error || !data) {
      return { error: error?.message ?? 'Failed to create profile.' };
    }

    const profile: ChildProfile = {
      id: data.id,
      name: data.name,
      age: data.age,
      gender: data.gender as ChildProfile['gender'],
      avatarEmoji: data.avatar_emoji,
    };

    addProfile(profile);
    setSelectedChildId(profile.id);
    return { error: null };
  };

  return { loadProfiles, createProfile };
}
