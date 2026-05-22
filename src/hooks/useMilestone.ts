import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

export type MilestoneType = 'streak_7' | 'streak_30' | 'count_100';

export interface MilestoneDetail {
  id: string;
  type: MilestoneType;
  triggered_at: string;
  // Storage path (e.g. '{userId}/{milestoneId}.jpg'), not a URL.
  // Generate a signed URL on the client before displaying.
  photo_url: string | null;
  parent_note: string | null;
  task_id: string;
  task_name: string;
  task_icon: string;
}

export function useMilestone(milestoneId: string | null) {
  const [milestone, setMilestone] = useState<MilestoneDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!milestoneId) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('milestone')
      .select('id, type, triggered_at, photo_url, parent_note, task_id, task:task_id(name, icon)')
      .eq('id', milestoneId)
      .single();

    if (err || !data) {
      setError('Could not load milestone.');
      setLoading(false);
      return;
    }

    const task = data.task as { name: string; icon: string } | null;
    setMilestone({
      id:           data.id,
      type:         data.type as MilestoneType,
      triggered_at: data.triggered_at,
      photo_url:    data.photo_url ?? null,
      parent_note:  data.parent_note ?? null,
      task_id:      data.task_id,
      task_name:    task?.name ?? '',
      task_icon:    task?.icon ?? '',
    });
    setLoading(false);
  }, [milestoneId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { milestone, loading, error, refresh: load };
}
