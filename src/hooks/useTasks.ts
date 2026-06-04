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

// task_cache_{childId}_{date}   → TaskItem[] (schedule-filtered for that date)
// completions_cache_{childId}_{date} → string[]  (task IDs completed that date)
function taskCacheKey(childId: string, date: string): string {
  return `task_cache_${childId}_${date}`;
}

function completionsCacheKey(childId: string, date: string): string {
  return `completions_cache_${childId}_${date}`;
}

export function useTasks(childId: string | null) {
  const userId = useAuthStore((s) => s.currentUser?.id);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);

  const today = todayString();

  // Read filtered task list + completedIds from cache, overlay offline queue.
  const loadFromCache = async (cid: string) => {
    try {
      const taskKey = taskCacheKey(cid, today);
      const completionsKey = completionsCacheKey(cid, today);
      console.log('[useTasks] loadFromCache — taskKey:', taskKey, '| completionsKey:', completionsKey);

      const [tasksRaw, completionsRaw] = await Promise.all([
        AsyncStorage.getItem(taskKey),
        AsyncStorage.getItem(completionsKey),
      ]);

      console.log('[useTasks] loadFromCache — tasks raw:', tasksRaw ? `${tasksRaw.slice(0, 100)}…` : 'NULL');
      console.log('[useTasks] loadFromCache — completions raw:', completionsRaw ?? 'NULL');

      if (!tasksRaw) return;

      const cachedTasks: Array<{ id: string; name: string; icon: string }> = JSON.parse(tasksRaw);
      const completedIds = new Set<string>(completionsRaw ? JSON.parse(completionsRaw) : []);

      const queue = await getQueue();
      const queuedIds = new Set(
        queue
          .filter((q) => q.childId === cid && q.completedAt === today)
          .map((q) => q.taskId)
      );

      console.log('[useTasks] loadFromCache — tasks:', cachedTasks.length, cachedTasks.map((t) => t.name), '| completedIds:', [...completedIds], '| queuedIds:', [...queuedIds]);

      setTasks(
        cachedTasks.map((t) => ({
          ...t,
          isCompleted: completedIds.has(t.id) || queuedIds.has(t.id),
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
    console.log('[useTasks] NetInfo —', { isConnected: net.isConnected, isInternetReachable: net.isInternetReachable, childId, today });
    if (net.isConnected !== true || net.isInternetReachable === false) {
      console.log('[useTasks] OFFLINE — reading from cache');
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

      // Supabase succeeded — build task list for display and write full raw data to cache.
      const now = new Date();
      console.log('[useTasks] Supabase returned', taskData.length, 'tasks (before schedule filter):', taskData.map((t: any) => `${t.name}(${t.frequency})`));
      const completedSet = new Set((completionData ?? []).map((c: any) => c.task_id as string));

      const todaysTasks: TaskItem[] = taskData
        .filter((t: any) => {
          const scheduled = isScheduledToday(t as RawTask, now);
          if (!scheduled) console.log('[useTasks] FILTERED OUT by schedule:', t.name, '| frequency:', t.frequency, '| custom_days:', t.custom_days, '| today DOW:', isoWeekday(now));
          return scheduled;
        })
        .map((t: any) => ({
          id: t.id as string,
          name: t.name as string,
          icon: t.icon as string,
          isCompleted: completedSet.has(t.id),
        }));

      setTasks(todaysTasks);

      try {
        const taskKey = taskCacheKey(childId, today);
        const completionsKey = completionsCacheKey(childId, today);
        // Store id/name/icon only — isCompleted is derived from completions cache at read time.
        await AsyncStorage.setItem(taskKey, JSON.stringify(todaysTasks.map(({ id, name, icon }) => ({ id, name, icon }))));
        await AsyncStorage.setItem(completionsKey, JSON.stringify([...completedSet]));
        console.log('[useTasks] cache WRITE — tasks:', todaysTasks.length, '| completedIds:', completedSet.size);
      } catch (e) {
        console.log('[useTasks] cache WRITE failed:', e);
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
      // Keep completions cache in sync so going offline later reflects this completion.
      try {
        const key = completionsCacheKey(childId, today);
        const raw = await AsyncStorage.getItem(key);
        const ids: string[] = raw ? JSON.parse(raw) : [];
        if (!ids.includes(taskId)) {
          await AsyncStorage.setItem(key, JSON.stringify([...ids, taskId]));
        }
      } catch { }
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
