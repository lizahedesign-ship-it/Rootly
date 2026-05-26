// supabase/functions/check-never-miss-twice/index.ts
// Slice 13 — Never Miss Twice notification
//
// Triggered by cron: daily at 08:00 UTC
// (Configure in Supabase Dashboard > Edge Functions > Schedule)
//
// Logic: for each active, non-graduated task —
//   if yesterday AND the day before were both scheduled days AND both missed,
//   AND we haven't already notified for this miss streak → send one push.
//
// Deduplication: task.never_miss_notified_at stores the date of the second
// consecutive miss when a notification was last sent. If no completion exists
// after that date, the streak is ongoing and we skip. Once a completion
// appears after that date, the streak ended and future misses are eligible again.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---------------------------------------------------------------------------
// Date helpers (UTC throughout)
// ---------------------------------------------------------------------------

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return toDateStr(d)
}

// ---------------------------------------------------------------------------
// Schedule check
// ---------------------------------------------------------------------------

// Returns true if dateStr is a scheduled day for this task.
// Also verifies the task existed on that date (created_at check).
function isScheduledOn(
  dateStr: string,
  createdAt: string,
  frequency: string,
  customDays: number[],
): boolean {
  // Task didn't exist yet on this date
  if (createdAt.split('T')[0] > dateStr) return false

  const d = new Date(dateStr + 'T00:00:00Z')
  const dow = d.getUTCDay()         // 0 = Sun
  const iso = dow === 0 ? 7 : dow   // 1 = Mon … 7 = Sun

  switch (frequency) {
    case 'daily':    return true
    case 'weekdays': return iso <= 5
    case 'weekends': return iso >= 6
    case 'custom':   return customDays.includes(iso)
    default:         return false
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

interface Task {
  id: string
  parent_id: string
  child_id: string
  name: string
  icon: string
  frequency: string
  custom_days: number[] | null
  created_at: string
  never_miss_notified_at: string | null
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

    const todayStr     = toDateStr(new Date())
    const yesterday    = addDays(todayStr, -1)
    const dayBefore    = addDays(todayStr, -2)

    // -------------------------------------------------------------------------
    // 1. Fetch all active, non-graduated tasks
    // -------------------------------------------------------------------------
    const { data: tasks, error: tasksErr } = await supabase
      .from('task')
      .select('id, parent_id, child_id, name, icon, frequency, custom_days, created_at, never_miss_notified_at')
      .eq('is_active', true)
      .eq('is_graduated', false)

    if (tasksErr) throw tasksErr
    if (!tasks?.length) {
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const taskIds = (tasks as Task[]).map((t) => t.id)

    // -------------------------------------------------------------------------
    // 2. Fetch completions for these tasks over the past 90 days (one query)
    // -------------------------------------------------------------------------
    const windowStart = addDays(todayStr, -90)
    const { data: completions, error: compErr } = await supabase
      .from('task_completion')
      .select('task_id, completed_at')
      .in('task_id', taskIds)
      .gte('completed_at', windowStart)

    if (compErr) throw compErr

    // Group completions by task_id for fast lookup
    const completionsByTask: Record<string, Set<string>> = {}
    for (const c of completions ?? []) {
      if (!completionsByTask[c.task_id]) completionsByTask[c.task_id] = new Set()
      completionsByTask[c.task_id].add(c.completed_at as string)
    }

    // -------------------------------------------------------------------------
    // 3. Fetch all parent push tokens (one query)
    // -------------------------------------------------------------------------
    const parentIds = [...new Set((tasks as Task[]).map((t) => t.parent_id))]
    const { data: accounts } = await supabase
      .from('parent_account')
      .select('id, push_token')
      .in('id', parentIds)

    const tokenByParent: Record<string, string | null> = {}
    for (const a of accounts ?? []) {
      tokenByParent[a.id] = a.push_token ?? null
    }

    // -------------------------------------------------------------------------
    // 4. Evaluate each task
    // -------------------------------------------------------------------------
    const pushMessages: object[] = []
    const taskUpdates: { id: string; never_miss_notified_at: string }[] = []

    for (const task of tasks as Task[]) {
      // Both days must be scheduled for this task
      const daysToCheck = [yesterday, dayBefore]
      const bothScheduled = daysToCheck.every((d) =>
        isScheduledOn(d, task.created_at, task.frequency, task.custom_days ?? [])
      )
      if (!bothScheduled) continue

      const completions = completionsByTask[task.id] ?? new Set<string>()

      // Both days must be missed
      if (completions.has(yesterday) || completions.has(dayBefore)) continue

      // Deduplication: skip if we already notified for this streak
      if (task.never_miss_notified_at) {
        const hasCompletionSinceNotification = [...completions].some(
          (d) => d > task.never_miss_notified_at!,
        )
        if (!hasCompletionSinceNotification) continue
        // Completion found after last notification → streak ended and restarted → proceed
      }

      // Check push token
      const pushToken = tokenByParent[task.parent_id]
      if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) continue

      pushMessages.push({
        to:    pushToken,
        title: `${task.icon} ${task.name} — two days missed`,
        body:  'Two days in a row. Worth a quick conversation — no pressure!',
        sound: 'default',
        data:  { task_id: task.id },
      })

      taskUpdates.push({ id: task.id, never_miss_notified_at: yesterday })
    }

    // -------------------------------------------------------------------------
    // 5. Send pushes
    // -------------------------------------------------------------------------
    if (pushMessages.length > 0) {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(pushMessages),
      })
    }

    // -------------------------------------------------------------------------
    // 6. Update never_miss_notified_at for notified tasks
    // -------------------------------------------------------------------------
    for (const { id, never_miss_notified_at } of taskUpdates) {
      await supabase
        .from('task')
        .update({ never_miss_notified_at })
        .eq('id', id)
    }

    return new Response(
      JSON.stringify({ notified: pushMessages.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
