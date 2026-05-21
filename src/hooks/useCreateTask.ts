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
    supabase
      .from('task')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('is_active', true)
      .eq('is_graduated', false)
      .then(({ count }) => {
        setTaskCount(count ?? 0);
      });
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
