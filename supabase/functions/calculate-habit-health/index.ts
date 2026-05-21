// supabase/functions/calculate-habit-health/index.ts
// Slice 11 — Habit health calculation
//
// POST /functions/v1/calculate-habit-health
// Authorization: Bearer <service_role_key>
// Body (optional): { "user_id": "uuid" }
//
// If user_id is provided, only that user's tasks are processed.
// If omitted, all users' active tasks are processed.
//
// Inserts one new row into habit_health_snapshot per task per run
// (history preserved; useHabitHealth hook queries latest row by computed_at DESC).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Task {
  id: string
  parent_id: string
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom'
  custom_days: number[] | null
  created_at: string
}

interface Snapshot {
  task_id: string
  parent_id: string
  computed_at: string
  stage: 'sprouting' | 'growing' | 'rooted' | 'blooming'
  consistency_rate: number
  avg_recovery_days: number | null
  trend: 'up' | 'flat' | 'down'
}

// ---------------------------------------------------------------------------
// Date helpers (all UTC to avoid timezone drift)
// ---------------------------------------------------------------------------

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

/** Return the YYYY-MM-DD string `days` offset from dateStr (negative = past). */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return toDateStr(d)
}

/** Whole days between two YYYY-MM-DD strings (b − a). */
function daysBetween(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()
  return Math.round(ms / 86_400_000)
}

// ---------------------------------------------------------------------------
// Scheduled days
// ---------------------------------------------------------------------------

/**
 * Returns every YYYY-MM-DD string from task creation through today (inclusive)
 * that matches the task's frequency/custom_days schedule.
 *
 * ISO weekday convention: 1 = Mon … 7 = Sun
 */
function getScheduledDays(
  createdAt: string,  // timestamptz string — only the date part is used
  todayStr: string,
  frequency: string,
  customDays: number[],
): string[] {
  const days: string[] = []
  const end = new Date(todayStr + 'T00:00:00Z')
  const current = new Date(createdAt.split('T')[0] + 'T00:00:00Z')

  while (current <= end) {
    const dow = current.getUTCDay()          // 0 = Sun
    const iso = dow === 0 ? 7 : dow          // 1 = Mon … 7 = Sun

    const scheduled =
      frequency === 'daily'    ? true :
      frequency === 'weekdays' ? iso <= 5 :
      frequency === 'weekends' ? iso >= 6 :
      frequency === 'custom'   ? customDays.includes(iso) :
      false

    if (scheduled) days.push(toDateStr(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return days
}

// ---------------------------------------------------------------------------
// Signal: consistency_rate
// ---------------------------------------------------------------------------

function calcConsistencyRate(scheduledDays: string[], completionSet: Set<string>): number {
  if (scheduledDays.length === 0) return 0
  const completed = scheduledDays.filter(d => completionSet.has(d)).length
  return parseFloat(((completed / scheduledDays.length) * 100).toFixed(2))
}

// ---------------------------------------------------------------------------
// Signal: avg_recovery_days
// ---------------------------------------------------------------------------

/**
 * A "miss event" begins on the first scheduled day with no completion.
 * Recovery = days from that first missed day to the next completion on ANY day.
 * Only recovered miss events count (open trailing streaks are excluded).
 * Returns null if fewer than 3 recovered miss events exist.
 */
function calcAvgRecoveryDays(
  scheduledDays: string[],
  completionSet: Set<string>,
  sortedCompletions: string[],  // sorted ascending, already from the DB query
): number | null {
  const recoveries: number[] = []
  let missStart: string | null = null

  for (const day of scheduledDays) {
    if (missStart !== null) {
      // Has any completion landed between missStart and this scheduled day?
      const hit = sortedCompletions.find(c => c > missStart! && c <= day)
      if (hit) {
        recoveries.push(daysBetween(missStart, hit))
        missStart = null
      }
    }

    if (completionSet.has(day)) {
      missStart = null                  // completed scheduled day — clear streak
    } else if (missStart === null) {
      missStart = day                   // first missed scheduled day in a new streak
    }
  }

  // Trailing miss streak: check for a recovery after the last scheduled day
  if (missStart !== null) {
    const hit = sortedCompletions.find(c => c > missStart!)
    if (hit) recoveries.push(daysBetween(missStart, hit))
  }

  if (recoveries.length < 3) return null
  const avg = recoveries.reduce((a, b) => a + b, 0) / recoveries.length
  return parseFloat(avg.toFixed(2))
}

// ---------------------------------------------------------------------------
// Signal: trend
// ---------------------------------------------------------------------------

/**
 * Compares consistency_rate over the last 28 calendar days vs the preceding
 * 28 calendar days (days 29–56 back from today).
 * Windows are measured only over scheduled days within each period.
 * delta > +5 pp → 'up' | delta < −5 pp → 'down' | else → 'flat'
 */
function calcTrend(
  scheduledDays: string[],
  completionSet: Set<string>,
  todayStr: string,
): 'up' | 'flat' | 'down' {
  // Current window: [today-27 … today]  (28 days inclusive)
  const curStart  = addDays(todayStr, -27)
  // Previous window: [today-55 … today-28]  (28 days inclusive)
  const prevStart = addDays(todayStr, -55)
  const prevEnd   = addDays(todayStr, -28)

  const curWindow  = scheduledDays.filter(d => d >= curStart  && d <= todayStr)
  const prevWindow = scheduledDays.filter(d => d >= prevStart && d <= prevEnd)

  if (curWindow.length === 0 || prevWindow.length === 0) return 'flat'

  const curRate  = curWindow.filter(d => completionSet.has(d)).length  / curWindow.length  * 100
  const prevRate = prevWindow.filter(d => completionSet.has(d)).length / prevWindow.length * 100
  const delta    = curRate - prevRate

  if (delta >  5) return 'up'
  if (delta < -5) return 'down'
  return 'flat'
}

// ---------------------------------------------------------------------------
// Stage determination
// ---------------------------------------------------------------------------

/**
 * Thresholds (agreed in Slice 11 planning):
 *   age < 14 days                                    → sprouting
 *   age ≥ 14 AND (rate < 50 OR trend == 'down')      → growing   (needs attention)
 *   age ≥ 14 AND 50 ≤ rate < 80 AND trend ≠ 'down'  → rooted
 *   age ≥ 14 AND rate ≥ 80 AND trend ≠ 'down'        → blooming
 */
function calcStage(
  createdAt: string,
  todayStr: string,
  rate: number,
  trend: string,
): 'sprouting' | 'growing' | 'rooted' | 'blooming' {
  const ageDays = daysBetween(createdAt.split('T')[0], todayStr)
  if (ageDays < 14)                      return 'sprouting'
  if (rate < 50 || trend === 'down')     return 'growing'
  if (rate < 80)                         return 'rooted'
  return 'blooming'
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Parse optional user_id from request body
    let userId: string | null = null
    try {
      const body = await req.json()
      userId = body?.user_id ?? null
    } catch {
      // No body or unparseable JSON — process all users
    }

    // -----------------------------------------------------------------------
    // 1. Fetch active, non-graduated tasks
    // -----------------------------------------------------------------------
    let tasksQuery = supabase
      .from('task')
      .select('id, parent_id, frequency, custom_days, created_at')
      .eq('is_active', true)
      .eq('is_graduated', false)

    if (userId) tasksQuery = tasksQuery.eq('parent_id', userId)

    const { data: tasks, error: tasksErr } = await tasksQuery
    if (tasksErr) throw tasksErr
    if (!tasks?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // -----------------------------------------------------------------------
    // 2. Fetch completions for all those tasks in one query
    // -----------------------------------------------------------------------
    const { data: completions, error: completionsErr } = await supabase
      .from('task_completion')
      .select('task_id, completed_at')
      .in('task_id', tasks.map((t: Task) => t.id))
      .order('completed_at', { ascending: true })

    if (completionsErr) throw completionsErr

    // Group by task_id; already sorted ascending from the query
    const byTask: Record<string, string[]> = {}
    for (const c of completions ?? []) {
      ;(byTask[c.task_id] ??= []).push(c.completed_at as string)
    }

    // -----------------------------------------------------------------------
    // 3. Compute signals + stage for each task
    // -----------------------------------------------------------------------
    const todayStr = toDateStr(new Date())
    const snapshots: Snapshot[] = []

    for (const task of tasks as Task[]) {
      const scheduledDays = getScheduledDays(
        task.created_at,
        todayStr,
        task.frequency,
        task.custom_days ?? [],
      )
      if (scheduledDays.length === 0) continue   // safety guard

      const sortedCompletions = byTask[task.id] ?? []
      const completionSet     = new Set(sortedCompletions)

      const rate        = calcConsistencyRate(scheduledDays, completionSet)
      const avgRecovery = calcAvgRecoveryDays(scheduledDays, completionSet, sortedCompletions)
      const trend       = calcTrend(scheduledDays, completionSet, todayStr)
      const stage       = calcStage(task.created_at, todayStr, rate, trend)

      snapshots.push({
        task_id:           task.id,
        parent_id:         task.parent_id,
        computed_at:       new Date().toISOString(),
        stage,
        consistency_rate:  rate,
        avg_recovery_days: avgRecovery,
        trend,
      })
    }

    // -----------------------------------------------------------------------
    // 4. Insert snapshots (one new row per task, history preserved)
    // -----------------------------------------------------------------------
    if (snapshots.length > 0) {
      const { error: insertErr } = await supabase
        .from('habit_health_snapshot')
        .insert(snapshots)
      if (insertErr) throw insertErr
    }

    return new Response(JSON.stringify({ processed: snapshots.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
