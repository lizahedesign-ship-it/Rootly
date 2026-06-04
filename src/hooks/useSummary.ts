import { useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import {
  SchedulableTask,
  isScheduledOnDate,
  formatDateString,
  weekStart,
  monthStart,
  monthEnd,
  yearStart,
  yearEnd,
  addDays,
} from '../utils/dateUtils';

export type SummaryView = 'weekly' | 'monthly' | 'annual';

export interface ChartBar {
  label:     string; // x-axis label ('' = no label shown)
  rate:      number; // 0–1 completion rate
  completed: number;
  scheduled: number;
}

export interface TaskStat {
  taskId:    string;
  name:      string;
  icon:      string;
  completed: number;
  scheduled: number;
  rate:      number; // 0–1
}

type SummaryTask = SchedulableTask & {
  id:   string;
  name: string;
  icon: string;
};

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW_SHORT   = ['M','T','W','T','F','S','S']; // index 0 = Monday

export function useSummary(childId: string | null, view: SummaryView) {
  const [chartBars,     setChartBars]     = useState<ChartBar[]>([]);
  const [taskStats,     setTaskStats]     = useState<TaskStat[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [totalScheduled, setTotalScheduled] = useState(0);
  const [loading,       setLoading]       = useState(false);

  const load = useCallback(async () => {
    if (!childId) {
      setChartBars([]);
      setTaskStats([]);
      setTotalCompleted(0);
      setTotalScheduled(0);
      return;
    }

    setLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ── Date range for this view ──────────────────────────────────────────────
    let rangeStart: Date;
    let rangeEnd:   Date;

    switch (view) {
      case 'weekly':
        rangeStart = weekStart(today);
        rangeEnd   = addDays(rangeStart, 6); // Mon–Sun
        break;
      case 'monthly':
        rangeStart = monthStart(today);
        rangeEnd   = monthEnd(today);
        break;
      case 'annual':
        rangeStart = yearStart(today);
        rangeEnd   = yearEnd(today);
        break;
    }

    // Cap query end to today — no future completions exist
    const queryEnd = rangeEnd <= today ? rangeEnd : today;

    try {
      const [{ data: taskData }, { data: completionData }] = await Promise.all([
        // All tasks for this child (including graduated — for historical accuracy)
        supabase
          .from('task')
          .select('id, name, icon, frequency, custom_days, created_at')
          .eq('child_id', childId),

        // Completions within the date range
        supabase
          .from('task_completion')
          .select('task_id, completed_at')
          .eq('child_id', childId)
          .gte('completed_at', formatDateString(rangeStart))
          .lte('completed_at', formatDateString(queryEnd)),
      ]);

      const tasks: SummaryTask[] = (taskData ?? []).map((t: any) => ({
        id:          t.id          as string,
        name:        t.name        as string,
        icon:        t.icon        as string,
        frequency:   t.frequency,
        custom_days: t.custom_days ?? null,
        created_at:  t.created_at  as string,
      }));

      // Build date → Set<taskId> map from completions
      const byDate = new Map<string, Set<string>>();
      for (const c of (completionData ?? [])) {
        const d = c.completed_at as string;
        if (!byDate.has(d)) byDate.set(d, new Set());
        byDate.get(d)!.add(c.task_id as string);
      }

      // ── Chart bars ────────────────────────────────────────────────────────
      const bars: ChartBar[] =
        view === 'annual'
          ? buildMonthlyBars(byDate, tasks, today.getFullYear(), today)
          : buildDailyBars(byDate, tasks, rangeStart, queryEnd, view);

      // ── Per-task stats ────────────────────────────────────────────────────
      const stats = buildTaskStats(byDate, tasks, rangeStart, queryEnd);

      const totC = stats.reduce((s, t) => s + t.completed, 0);
      const totS = stats.reduce((s, t) => s + t.scheduled, 0);

      setChartBars(bars);
      setTaskStats(stats);
      setTotalCompleted(totC);
      setTotalScheduled(totS);
    } catch {
      // Network unavailable — leave previous state, show empty state
      setChartBars([]);
      setTaskStats([]);
      setTotalCompleted(0);
      setTotalScheduled(0);
    }

    setLoading(false);
  }, [childId, view]);

  return { chartBars, taskStats, totalCompleted, totalScheduled, loading, reload: load };
}

// ─── Computation helpers ─────────────────────────────────────────────────────

function scheduledAndCompleted(
  tasks: SummaryTask[],
  byDate: Map<string, Set<string>>,
  date: Date,
): { scheduled: number; completed: number } {
  const scheduledTasks = tasks.filter(t => isScheduledOnDate(t, date));
  const dateStr        = formatDateString(date);
  const doneToday      = byDate.get(dateStr) ?? new Set<string>();
  const scheduledIds   = new Set(scheduledTasks.map(t => t.id));
  return {
    scheduled: scheduledTasks.length,
    completed: [...doneToday].filter(id => scheduledIds.has(id)).length,
  };
}

function buildDailyBars(
  byDate:     Map<string, Set<string>>,
  tasks:      SummaryTask[],
  rangeStart: Date,
  rangeEnd:   Date,
  view:       'weekly' | 'monthly',
): ChartBar[] {
  const bars: ChartBar[] = [];
  const current = new Date(rangeStart);
  let dayIndex  = 0;

  while (current <= rangeEnd) {
    const { scheduled, completed } = scheduledAndCompleted(tasks, byDate, current);

    // Label: weekly → M T W T F S S; monthly → show day number every 7th bar
    let label = '';
    if (view === 'weekly') {
      label = DOW_SHORT[dayIndex];
    } else if (dayIndex % 7 === 0) {
      label = String(current.getDate());
    }

    bars.push({
      label,
      rate: scheduled === 0 ? 0 : completed / scheduled,
      completed,
      scheduled,
    });

    current.setDate(current.getDate() + 1);
    dayIndex++;
  }

  return bars;
}

function buildMonthlyBars(
  byDate: Map<string, Set<string>>,
  tasks:  SummaryTask[],
  year:   number,
  today:  Date,
): ChartBar[] {
  return MONTH_SHORT.map((label, monthIndex) => {
    const mStart = new Date(year, monthIndex, 1);
    const mEnd   = new Date(year, monthIndex + 1, 0);

    // Months that haven't started yet are empty
    if (mStart > today) return { label, rate: 0, completed: 0, scheduled: 0 };

    // Cap at today for the current month
    const mQueryEnd = mEnd <= today ? mEnd : today;

    let totalScheduled = 0;
    let totalCompleted = 0;
    const current = new Date(mStart);

    while (current <= mQueryEnd) {
      const { scheduled, completed } = scheduledAndCompleted(tasks, byDate, current);
      totalScheduled += scheduled;
      totalCompleted += completed;
      current.setDate(current.getDate() + 1);
    }

    return {
      label,
      rate:      totalScheduled === 0 ? 0 : totalCompleted / totalScheduled,
      completed: totalCompleted,
      scheduled: totalScheduled,
    };
  });
}

function buildTaskStats(
  byDate:     Map<string, Set<string>>,
  tasks:      SummaryTask[],
  rangeStart: Date,
  rangeEnd:   Date,
): TaskStat[] {
  const stats: TaskStat[] = tasks.map(task => {
    let scheduled = 0;
    let completed = 0;
    const current = new Date(rangeStart);

    while (current <= rangeEnd) {
      if (isScheduledOnDate(task, current)) {
        scheduled++;
        const dateStr = formatDateString(current);
        if (byDate.get(dateStr)?.has(task.id)) completed++;
      }
      current.setDate(current.getDate() + 1);
    }

    return {
      taskId: task.id,
      name:   task.name,
      icon:   task.icon,
      completed,
      scheduled,
      rate: scheduled === 0 ? 0 : completed / scheduled,
    };
  });

  return stats
    .filter(s => s.scheduled > 0)   // only tasks active in this period
    .sort((a, b) => a.rate - b.rate); // worst first — matches habit health card sort
}
