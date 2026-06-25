import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import type { TaskCategory } from '../theme';

export interface CreateTaskData {
  childId: string;
  name: string;
  icon: string;
  category: TaskCategory;
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
  customDays: number[];
}

export function useCreateTask(childId: string | null) {
  const userId = useAuthStore((s) => s.currentUser?.id);
  const [creating, setCreating] = useState(false);
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    if (!childId) return;

    // Count active habits that are NOT blooming and NOT graduated.
    // Stage lives in habit_health_snapshot, not on task, so we need two queries.
    (async () => {
      // 1. Fetch all active, non-graduated task IDs for this child.
      const { data: tasks } = await supabase
        .from('task')
        .select('id')
        .eq('child_id', childId)
        .eq('is_active', true)
        .eq('is_graduated', false);

      if (!tasks || tasks.length === 0) {
        setTaskCount(0);
        return;
      }

      const taskIds = tasks.map((t: any) => t.id as string);

      // 2. Get the latest snapshot per task to determine current stage.
      const { data: snaps } = await supabase
        .from('habit_health_snapshot')
        .select('task_id, stage, computed_at')
        .in('task_id', taskIds)
        .order('computed_at', { ascending: false });

      const latestStage = new Map<string, string>();
      for (const snap of snaps ?? []) {
        if (!latestStage.has(snap.task_id)) {
          latestStage.set(snap.task_id, snap.stage as string);
        }
      }

      // 3. Exclude blooming habits. Tasks with no snapshot default to 'sprouting'.
      const count = taskIds.filter((id) => {
        const stage = latestStage.get(id) ?? 'sprouting';
        return stage !== 'blooming';
      }).length;

      setTaskCount(count);
    })();
  }, [childId]);

  const createTask = async (data: CreateTaskData): Promise<{ error: string | null }> => {
    if (!userId) return { error: 'Not logged in.' };
    setCreating(true);
    const { error } = await supabase.from('task').insert({
      child_id: data.childId,
      parent_id: userId,
      name: data.name,
      icon: data.icon,
      category: data.category,
      frequency: data.frequency,
      custom_days: data.frequency === 'custom' ? data.customDays : null,
    });
    setCreating(false);
    if (error) return { error: error.message };
    return { error: null };
  };

  return { createTask, creating, taskCount };
}
