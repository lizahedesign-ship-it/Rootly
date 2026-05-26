import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export interface GraduatedHabitItem {
  taskId: string;
  taskName: string;
  taskIcon: string;
}

export function useGraduatedHabits(childId: string | null) {
  const [graduatedHabits, setGraduatedHabits] = useState<GraduatedHabitItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGraduated = async () => {
    if (!childId) {
      setGraduatedHabits([]);
      return;
    }
    setLoading(true);

    const { data } = await supabase
      .from('task')
      .select('id, name, icon')
      .eq('child_id', childId)
      .eq('is_graduated', true)
      .order('graduated_at', { ascending: false });

    setGraduatedHabits(
      (data ?? []).map((t: any) => ({
        taskId:   t.id   as string,
        taskName: t.name as string,
        taskIcon: t.icon as string,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    loadGraduated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  return { graduatedHabits, loading, reload: loadGraduated };
}
