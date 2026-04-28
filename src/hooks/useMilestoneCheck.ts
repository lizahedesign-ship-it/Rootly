import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

type MilestoneType = 'streak_7' | 'streak_30' | 'count_100';

// Each threshold is earned once per task (unique constraint in DB)
const THRESHOLDS: { type: MilestoneType; minCount: number }[] = [
  { type: 'count_100', minCount: 100 },
  { type: 'streak_30', minCount: 30 },
  { type: 'streak_7',  minCount: 7  },
];

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Returns true if a new milestone was detected and written to DB.
// Silently ignores network errors to never crash child UI.
async function detectAndWriteMilestone(childId: string, userId: string): Promise<boolean> {
  const today = todayString();

  // 1. Tasks completed today
  const { data: completedToday } = await supabase
    .from('task_completion')
    .select('task_id')
    .eq('child_id', childId)
    .eq('completed_at', today);

  if (!completedToday?.length) return false;

  // 2. Milestones already earned for this child (de-dupe check)
  const { data: existing } = await supabase
    .from('milestone')
    .select('task_id, type')
    .eq('child_id', childId);

  const earned = new Set<string>(
    (existing ?? []).map((m: any) => `${m.task_id}:${m.type}`)
  );

  // 3. For each task completed today, check total completion count vs thresholds
  for (const { task_id } of completedToday as { task_id: string }[]) {
    const { count } = await supabase
      .from('task_completion')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', task_id);

    const total = count ?? 0;

    for (const { type, minCount } of THRESHOLDS) {
      const key = `${task_id}:${type}`;
      if (total >= minCount && !earned.has(key)) {
        // New milestone — write to DB. Ignore duplicate-key errors (safe to retry).
        await supabase.from('milestone').insert({
          task_id,
          child_id:    childId,
          parent_id:   userId,
          type,
          triggered_at: new Date().toISOString(),
        });
        return true; // First milestone found wins; show animation once
      }
    }
  }

  return false;
}

export function useMilestoneCheck(childId: string | null) {
  const userId = useAuthStore((s) => s.currentUser?.id);
  const [isMilestone, setIsMilestone] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!childId || !userId) {
      setChecking(false);
      return;
    }
    detectAndWriteMilestone(childId, userId)
      .then(setIsMilestone)
      .catch(() => {}) // Never crash child UI on network error
      .finally(() => setChecking(false));
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isMilestone, checking };
}
