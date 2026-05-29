import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { enqueueCompletion, getQueue } from '../services/offlineQueue';

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

// AsyncStorage key for the task list cache — scoped to child + date so
// yesterday's cache never bleeds into today's session.
function taskCacheKey(childId: string, date: string): string {
  return `task_cache_${childId}_${date}`;
}

export function useTasks(childId: string | null) {
  const userId = useAuthStore((s) => s.currentUser?.id);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);

  const today = todayString();

  // Read the cached task list and overlay any offline-queued completions.
  // Called whenever the Supabase fetch fails or throws.
  const loadFromCache = async (cid: string) => {
    try {
      const raw = await AsyncStorage.getItem(taskCacheKey(cid, today));
      if (!raw) return; // No cache yet — tasks stays [].
      const cached: TaskItem[] = JSON.parse(raw);
      const queue = await getQueue();
      const queuedIds = new Set(
        queue
          .filter((q) => q.childId === cid && q.completedAt === today)
          .map((q) => q.taskId)
      );
      setTasks(
        cached.map((t) => ({
          ...t,
          isCompleted: t.isCompleted || queuedIds.has(t.id),
        }))
      );
    } catch {
      // Cache read failed — leave tasks as [].
    }
  };

  const loadTasks = async () => {
    if (!childId) return;
    setLoading(true);

    // Check connectivity before querying. When offline the Supabase JS client
    // returns { data: [], error: null } — a successful empty result — so we
    // cannot rely on the error field alone to detect being offline.
    const net = await NetInfo.fetch();
    if (net.isConnected !== true || net.isInternetReachable === false) {
      await loadFromCache(childId);
      setLoading(false);
      return;
    }

    try {
      const [
        { data: taskData, error: taskError },
        { data: completionData },
      ] = await Promise.all([
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

      if (taskError || taskData === null) throw taskError ?? new Error('fetch_failed');

      // Supabase succeeded — build task list and write to cache.
      const now = new Date();
      const completedSet = new Set((completionData ?? []).map((c: any) => c.task_id as string));

      const todaysTasks: TaskItem[] = taskData
        .filter((t: any) => isScheduledToday(t as RawTask, now))
        .map((t: any) => ({
          id: t.id as string,
          name: t.name as string,
          icon: t.icon as string,
          isCompleted: completedSet.has(t.id),
        }));

      setTasks(todaysTasks);

      try {
        await AsyncStorage.setItem(taskCacheKey(childId, today), JSON.stringify(todaysTasks));
      } catch {
        // Cache write failure is non-fatal.
      }
    } catch {
      // Network threw or Supabase returned an error — fall back to cache.
      await loadFromCache(childId);
    }

    setLoading(false);
  };

  const completeTask = async (taskId: string) => {
    // Optimistic update — always instant, regardless of network.
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, isCompleted: true } : t))
    );
    if (!userId || !childId) return;

    const net = await NetInfo.fetch();
    const isOnline = net.isConnected === true && net.isInternetReachable !== false;

    if (isOnline) {
      await supabase.from('task_completion').upsert(
        { task_id: taskId, child_id: childId, parent_id: userId, completed_at: today },
        { onConflict: 'task_id,completed_at' }
      );
    } else {
      await enqueueCompletion({ taskId, childId, parentId: userId, completedAt: today });
    }
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
