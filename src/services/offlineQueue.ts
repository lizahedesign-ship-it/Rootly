import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QueuedCompletion {
  taskId: string;
  childId: string;
  parentId: string;
  completedAt: string; // "YYYY-MM-DD"
}

// ─── Storage key ──────────────────────────────────────────────────────────────

const QUEUE_KEY = 'offline_completion_queue';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function readQueue(): Promise<QueuedCompletion[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedCompletion[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedCompletion[]): Promise<void> {
  if (queue.length === 0) {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } else {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Add a completion to the offline queue.
 * Silently deduplicates on (taskId, completedAt) — safe to call multiple times
 * for the same task on the same day.
 */
export async function enqueueCompletion(item: QueuedCompletion): Promise<void> {
  const queue = await readQueue();
  const exists = queue.some(
    (q) => q.taskId === item.taskId && q.completedAt === item.completedAt
  );
  if (!exists) {
    await writeQueue([...queue, item]);
  }
}

/**
 * Flush all queued completions to Supabase.
 * - Items that succeed are removed from the queue.
 * - Items that fail are retained for the next reconnect attempt.
 * - A module-level flag prevents concurrent flushes.
 */
let isFlushing = false;

export async function flushQueue(supabase: SupabaseClient): Promise<void> {
  if (isFlushing) return;
  isFlushing = true;

  try {
    const queue = await readQueue();
    if (queue.length === 0) return;

    const remaining: QueuedCompletion[] = [];

    for (const item of queue) {
      const { error } = await supabase.from('task_completion').upsert(
        {
          task_id: item.taskId,
          child_id: item.childId,
          parent_id: item.parentId,
          completed_at: item.completedAt,
        },
        { onConflict: 'task_id,completed_at' }
      );
      if (error) {
        remaining.push(item); // keep — retry on next reconnect
      }
    }

    await writeQueue(remaining);
  } finally {
    isFlushing = false;
  }
}
