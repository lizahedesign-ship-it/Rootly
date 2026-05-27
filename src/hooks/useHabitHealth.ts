import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Cache key is child-scoped only (habit health is not date-specific — computed nightly).
function habitCacheKey(childId: string): string {
  return `habit_health_cache_${childId}`;
}

export function useHabitHealth(childId: string | null) {
  const [habits, setHabits] = useState<HabitHealthItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHabits = async () => {
    if (!childId) {
      setHabits([]);
      return;
    }
    setLoading(true);

    try {
      const { data: taskData, error: taskError } = await supabase
        .from('task')
        .select('id, name, icon')
        .eq('child_id', childId)
        .eq('is_active', true)
        .eq('is_graduated', false);

      // Treat a returned error or null the same as a thrown network error.
      if (taskError || taskData === null) throw taskError ?? new Error('fetch_failed');

      const taskIds = taskData.map((t: any) => t.id as string);

      const { data: snapData, error: snapError } = taskIds.length > 0
        ? await supabase
            .from('habit_health_snapshot')
            .select('task_id, stage, computed_at')
            .in('task_id', taskIds)
            .order('computed_at', { ascending: false })
        : { data: [], error: null };

      if (snapError) throw snapError;

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
        stage: latestStageByTask.get(t.id) ?? 'sprouting',
      }));

      items.sort((a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage]);

      setHabits(items);

      // Write to cache for offline use.
      try {
        await AsyncStorage.setItem(habitCacheKey(childId), JSON.stringify(items));
      } catch {
        // Cache write failure is non-fatal.
      }
    } catch {
      // Network unavailable or Supabase error — read from cache.
      try {
        const raw = await AsyncStorage.getItem(habitCacheKey(childId));
        setHabits(raw ? (JSON.parse(raw) as HabitHealthItem[]) : []);
      } catch {
        setHabits([]);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadHabits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  return { habits, loading, reload: loadHabits };
}
