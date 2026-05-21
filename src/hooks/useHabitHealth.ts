import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { HabitStage } from '../theme';

export interface HabitHealthItem {
  taskId: string;
  taskName: string;
  taskIcon: string;
  stage: HabitStage;
}

// Sort order: Growing (needs attention) first → Sprouting → Rooted → Blooming
const STAGE_ORDER: Record<HabitStage, number> = {
  growing:   0,
  sprouting: 1,
  rooted:    2,
  blooming:  3,
  graduated: 4,
};

export function useHabitHealth(childId: string | null) {
  const [habits, setHabits] = useState<HabitHealthItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHabits = async () => {
    if (!childId) {
      setHabits([]);
      return;
    }
    setLoading(true);

    const { data: taskData } = await supabase
      .from('task')
      .select('id, name, icon')
      .eq('child_id', childId)
      .eq('is_active', true)
      .eq('is_graduated', false);

    if (!taskData || taskData.length === 0) {
      setHabits([]);
      setLoading(false);
      return;
    }

    const taskIds = taskData.map((t: any) => t.id as string);

    // Fetch snapshots ordered newest-first; take first occurrence per task_id
    const { data: snapData } = await supabase
      .from('habit_health_snapshot')
      .select('task_id, stage, computed_at')
      .in('task_id', taskIds)
      .order('computed_at', { ascending: false });

    const latestStageByTask = new Map<string, HabitStage>();
    for (const snap of snapData ?? []) {
      if (!latestStageByTask.has(snap.task_id)) {
        latestStageByTask.set(snap.task_id, snap.stage as HabitStage);
      }
    }

    const items: HabitHealthItem[] = taskData.map((t: any) => ({
      taskId:   t.id   as string,
      taskName: t.name as string,
      taskIcon: t.icon as string,
      // Default to sprouting when no snapshot exists yet (new tasks)
      stage: latestStageByTask.get(t.id) ?? 'sprouting',
    }));

    items.sort((a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage]);

    setHabits(items);
    setLoading(false);
  };

  useEffect(() => {
    loadHabits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  return { habits, loading, reload: loadHabits };
}
