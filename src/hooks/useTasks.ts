import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

export interface TaskItem {
  id: string;
  name: string;
  icon: string;
  isCompleted: boolean;
}

interface RawTask {
  id: string;
  child_id: string;
  name: string;
  icon: string;
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
  custom_days: number[] | null;
}

// Returns ISO weekday 1 (Mon) – 7 (Sun) for a given Date
function isoWeekday(date: Date): number {
  const d = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return d === 0 ? 7 : d;
}

function isScheduledToday(task: RawTask, today: Date): boolean {
  const dow = isoWeekday(today);
  switch (task.frequency) {
    case 'daily':    return true;
    case 'weekdays': return dow >= 1 && dow <= 5;
    case 'weekends': return dow === 6 || dow === 7;
    case 'custom':   return (task.custom_days ?? []).includes(dow);
  }
}

// Today as YYYY-MM-DD using local timezone
function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function useTasks(childId: string | null) {
  const userId = useAuthStore((s) => s.currentUser?.id);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);

  const today = todayString();

  const loadTasks = async () => {
    if (!childId) return;
    setLoading(true);

    const [{ data: taskData }, { data: completionData }] = await Promise.all([
      supabase
        .from('task')
        .select('id, child_id, name, icon, frequency, custom_days')
        .eq('child_id', childId)
        .eq('is_active', true)
        .eq('is_graduated', false),
      supabase
        .from('task_completion')
        .select('task_id')
        .eq('child_id', childId)
        .eq('completed_at', today),
    ]);

    const now = new Date();
    const completedSet = new Set((completionData ?? []).map((c: any) => c.task_id as string));

    const todaysTasks: TaskItem[] = (taskData ?? [])
      .filter((t: any) => isScheduledToday(t as RawTask, now))
      .map((t: any) => ({
        id: t.id as string,
        name: t.name as string,
        icon: t.icon as string,
        isCompleted: completedSet.has(t.id),
      }));

    setTasks(todaysTasks);
    setLoading(false);
  };

  const completeTask = async (taskId: string) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, isCompleted: true } : t))
    );
    if (!userId || !childId) return;
    await supabase.from('task_completion').upsert(
      { task_id: taskId, child_id: childId, parent_id: userId, completed_at: today },
      { onConflict: 'task_id,completed_at' }
    );
  };

  const uncompleteTask = async (taskId: string) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, isCompleted: false } : t))
    );
    await supabase
      .from('task_completion')
      .delete()
      .eq('task_id', taskId)
      .eq('completed_at', today);
  };

  useEffect(() => {
    loadTasks();
  }, [childId]);

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const totalCount = tasks.length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  return { tasks, loading, completeTask, uncompleteTask, completedCount, totalCount, allDone };
}
